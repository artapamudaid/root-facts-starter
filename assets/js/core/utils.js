import {
	APP_CONFIG,
	UI_CONFIG,
} from './config.js';

export const isMobileDevice = () => {
	return navigator.userAgentData?.mobile ?? /Android|iPhone|iPad|iPod/i.test(navigator.userAgent);
};

export const createDelay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

export const isValidDetection = (result) => {
	const { detectionConfidenceThreshold } = APP_CONFIG;
	return result && result.isValid && result.confidence >= detectionConfidenceThreshold;
};

export const validateModelMetadata = (metadata) => {
	return metadata && metadata.labels && Array.isArray(metadata.labels);
};

export const getCameraErrorMessage = (error) => {
	if (error.name === 'NotAllowedError') {
		return 'Izin kamera ditolak. Harap izinkan akses kamera.';
	} else if (error.name === 'NotFoundError') {
		return 'Tidak ada kamera ditemukan pada perangkat ini.';
	} else if (error.name === 'NotReadableError') {
		return 'Kamera sedang digunakan oleh aplikasi lain.';
	}
	return 'Gagal memulai kamera';
};

export const addFadeInAnimation = (element) => {
	if (!element) return;

	const { fadeAnimation } = UI_CONFIG;
	element.style.animation = 'none';
	void element.offsetWidth; // Trigger reflow to restart animation
	element.style.animation = fadeAnimation;
};

export const hideElement = (element) => {
	if (element) element.classList.add('hidden');
};

export const showElement = (element) => {
	if (element) element.classList.remove('hidden');
};

export const setElementText = (element, text) => {
	if (element) element.textContent = text;
};

export const logError = (context, error) => {
	console.error(`❌ ${context}:`, error);
};

export const isWebGPUSupported = () => {
	return typeof navigator !== 'undefined' && 'gpu' in navigator;
};

