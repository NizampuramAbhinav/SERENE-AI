// backend/controllers/pdfController.js
// Generates a PDF export of the user's emotional journal history.
// Uses pdfkit. Labels AI predictions as estimates in the report.

const PDFDocument = require('pdfkit');
const { getDb } = require('../config/firebase');
const { getOrCreateUserStore } = require('./journalController');

function userRef(uid) {
  const db = getDb();
  if (!db) return null;
  return db.ref(`journals/${uid}`);
}

// GET /api/pdf/export
async function exportPDF(req, res) {
  try {
    const uid = req.user.uid;
    const userName = req.user.name || req.user.email || 'User';

    let entries = [];
    const ref = userRef(uid);
    if (ref) {
      const snapshot = await ref.orderByChild('createdAt').once('value');
      const raw = snapshot.val() || {};
      entries = Object.entries(raw)
        .map(([id, d]) => ({ id, ...d }))
        .sort((a, b) => b.createdAt - a.createdAt);
    } else {
      const store = getOrCreateUserStore(uid);
      entries = Array.from(store.values()).sort((a, b) => b.createdAt - a.createdAt);
    }

    const doc = new PDFDocument({ margin: 50 });
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="SERENE_AI_Journal_${Date.now()}.pdf"`);
    doc.pipe(res);

    // Header
    doc.fontSize(24).fillColor('#1a2744').text('SERENE AI', { align: 'center' });
    doc.fontSize(14).fillColor('#4a5568').text('Emotional Journal Export', { align: 'center' });
    doc.moveDown(0.5);
    doc.fontSize(10).fillColor('#718096')
      .text(`Generated for: ${userName}`, { align: 'center' })
      .text(`Date: ${new Date().toLocaleString()}`, { align: 'center' });
    doc.moveDown();

    // Disclaimer
    doc.rect(50, doc.y, doc.page.width - 100, 40).fillAndStroke('#fff8e1', '#f59e0b');
    doc.fontSize(8).fillColor('#92400e')
      .text(
        'DISCLAIMER: All emotion predictions are AI-generated estimates for self-reflection purposes only. ' +
        'They are NOT medical diagnoses or clinical assessments.',
        58, doc.y - 36, { width: doc.page.width - 116 }
      );
    doc.moveDown(2);

    if (entries.length === 0) {
      doc.fontSize(12).fillColor('#4a5568').text('No journal entries found.', { align: 'center' });
    } else {
      entries.forEach((entry, i) => {
        if (i > 0) doc.addPage();

        doc.fontSize(14).fillColor('#1a2744')
          .text(`Entry ${i + 1} — ${new Date(entry.createdAt).toLocaleString()}`);
        doc.moveTo(50, doc.y).lineTo(doc.page.width - 50, doc.y).strokeColor('#e2e8f0').stroke();
        doc.moveDown(0.5);

        if (entry.text) {
          doc.fontSize(10).fillColor('#4a5568').text('Your Entry:', { underline: true });
          doc.fontSize(10).fillColor('#2d3748').text(entry.text);
          doc.moveDown(0.5);
        }

        if (entry.sleepHours != null) {
          doc.fontSize(10).fillColor('#4a5568').text(`Sleep: ${entry.sleepHours} hours  |  Stress Level: ${entry.stressLevel ?? 'N/A'}/10`);
          doc.moveDown(0.5);
        }

        const emotion =
          entry.fusedResult?.fusedEmotion ||
          entry.textResult?.topEmotion ||
          entry.faceResult?.topEmotion ||
          entry.voiceResult?.topEmotion || 'N/A';
        const confidence =
          entry.fusedResult?.confidence ||
          entry.textResult?.confidence ||
          entry.faceResult?.confidence ||
          entry.voiceResult?.confidence;

        doc.fontSize(10).fillColor('#4a5568')
          .text(`AI-Estimated Emotion: `, { continued: true })
          .fillColor('#d97706')
          .text(emotion.toUpperCase());
        if (confidence) {
          doc.fontSize(10).fillColor('#4a5568')
            .text(`Confidence (estimate): ${Math.round(confidence * 100)}%`);
        }

        if (entry.recommendations?.feedback) {
          doc.moveDown(0.5);
          doc.fontSize(10).fillColor('#4a5568').text('AI Feedback:', { underline: true });
          doc.fontSize(10).fillColor('#2d3748').text(entry.recommendations.feedback);
        }
      });
    }

    doc.end();
  } catch (err) {
    console.error('[PDF]', err.message);
    if (!res.headersSent) {
      res.status(500).json({ error: err.message });
    }
  }
}

module.exports = { exportPDF };
