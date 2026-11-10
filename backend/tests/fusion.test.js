
const test = require('node:test');
const assert = require('node:assert/strict');

const { fuseEmotions } = require('../services/fusion');

// Test 1: All three modalities should be used.
test('combines text, face and voice predictions', () => {
    const result = fuseEmotions({
        text: {
            topEmotion: 'joy',
            distribution: [{ label: 'joy', score: 1 }],
        },
        face: {
            topEmotion: 'happy',
            distribution: [{ label: 'happy', score: 1 }],
        },
        voice: {
            topEmotion: 'calm',
            distribution: [{ label: 'calm', score: 1 }],
        },
    });

    assert.equal(result.fusedEmotion, 'joy');
    assert.deepEqual(result.modalitiesUsed, ['text', 'face', 'voice']);

    assert.ok(Math.abs(result.modalitiesWeights.text - 0.40) < 0.000001);
    assert.ok(Math.abs(result.modalitiesWeights.face - 0.35) < 0.000001);
    assert.ok(Math.abs(result.modalitiesWeights.voice - 0.25) < 0.000001);
});

// Test 2: Missing modalities should have their weights redistributed.
test('renormalises weights when voice is missing', () => {
    const result = fuseEmotions({
        text: {
            topEmotion: 'joy',
            distribution: [{ label: 'joy', score: 1 }],
        },
        face: {
            topEmotion: 'sad',
            distribution: [{ label: 'sad', score: 1 }],
        },
    });

    assert.deepEqual(result.modalitiesUsed, ['text', 'face']);

    assert.ok(Math.abs(result.modalitiesWeights.text - 0.40 / 0.75) < 0.000001);
    assert.ok(Math.abs(result.modalitiesWeights.face - 0.35 / 0.75) < 0.000001);
    assert.equal(result.fusedEmotion, 'joy');
});

// Test 3: Different emotion labels should map to common categories.
test('maps happy, angry and fearful to canonical emotions', () => {
    const result = fuseEmotions({
        text: {
            topEmotion: 'excitement',
            distribution: [{ label: 'excitement', score: 1 }],
        },
        face: {
            topEmotion: 'angry',
            distribution: [{ label: 'angry', score: 1 }],
        },
        voice: {
            topEmotion: 'fearful',
            distribution: [{ label: 'fearful', score: 1 }],
        },
    });

    assert.equal(result.fusedEmotion, 'joy');
    assert.equal(result.distribution.length, 7);
});

// Test 4: A single available modality should still produce a result.
test('supports text-only fusion', () => {
    const result = fuseEmotions({
        text: {
            topEmotion: 'sadness',
            distribution: [{ label: 'sadness', score: 1 }],
        },
    });

    assert.equal(result.fusedEmotion, 'sadness');
    assert.deepEqual(result.modalitiesUsed, ['text']);
    assert.equal(result.modalitiesWeights.text, 1);
});

// Test 5: Empty input should produce an error.
test('rejects input when no modality predictions are available', () => {
    assert.throws(
        () => fuseEmotions({}),
        /No modality predictions available for fusion/
    );
});
