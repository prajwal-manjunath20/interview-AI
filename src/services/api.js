import axios from 'axios';

const BASE_URL = '/api';

const api = axios.create({ baseURL: BASE_URL });

// Attach JWT to every request
api.interceptors.request.use((config) => {
    const token = localStorage.getItem('token');
    if (token) config.headers.Authorization = `Bearer ${token}`;
    return config;
});

// Unwrap data, surface error messages
api.interceptors.response.use(
    (res) => res.data,
    (err) => {
        const message = err.response?.data?.error || err.message || 'Network error';
        return Promise.reject(new Error(message));
    }
);

export const auth = {
    register: (email, password) => api.post('/auth/register', { email, password }),
    login: (email, password) => api.post('/auth/login', { email, password }),
};

export const interview = {
    start: (role, difficulty) => api.post('/interview/start', { role, difficulty }),
    evaluate: (sessionId, question, answer, questionIndex, currentDifficulty) => api.post('/interview/evaluate', { sessionId, question, answer, questionIndex, currentDifficulty }),
    followUp: (question, answer) => api.post('/interview/followup', { question, answer }),
    next: (sessionId, role, difficulty, prevQuestion, prevAnswer, score) => api.post('/interview/next', { sessionId, role, difficulty, prevQuestion, prevAnswer, score }),
    finish: (sessionId) => api.post('/interview/finish', { sessionId }),
};

export const analytics = {
    getSessions: () => api.get('/analytics/sessions'),
    getPerformance: () => api.get('/analytics/performance'),
};

export default api;
