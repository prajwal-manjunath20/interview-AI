function computeScore(evaluation) {
    const { relevance = 0, clarity = 0, depth = 0 } = evaluation;
    return Math.round(((relevance + clarity + depth) / 3) * 10) / 10;
}

function getNextDifficulty(score, current) {
    const levels = ['Junior', 'Mid', 'Senior'];
    const idx = levels.indexOf(current);
    if (score > 7 && idx < levels.length - 1) return levels[idx + 1];
    if (score < 4 && idx > 0) return levels[idx - 1];
    return current;
}

function isBehavioral(question) {
    const keywords = [
        'tell me about a time', 'describe a situation', 'give an example',
        'how did you handle', 'when you had to', 'challenge', 'conflict',
        'teamwork', 'leadership', 'failure', 'success', 'difficult',
    ];
    return keywords.some(k => question.toLowerCase().includes(k));
}

module.exports = { computeScore, getNextDifficulty, isBehavioral };
