import { UI_CONFIG } from '../core/config.js';
import {
	addFadeInAnimation,
	hideElement,
	showElement,
	setElementText,
	logError
} from '../core/utils.js';

class UIHandler {
	constructor() {
		this.config = UI_CONFIG;
		this.abortController = null;
		this.initializeElements();
	}

	initializeElements() {
		// Header status elements
		this.headerStatus = document.getElementById('header-status');
		this.headerStatusSpan = this.headerStatus?.querySelector('span:last-child');
		this.headerStatusDot = this.headerStatus?.querySelector('.status-dot');

		// Camera elements
		this.btnToggle = document.getElementById('btn-toggle');
		this.btnToggleIcon = this.btnToggle?.querySelector('i');
		this.cameraSelect = document.getElementById('camera-select');
		this.fpsSlider = document.getElementById('fps-slider');
		this.fpsLabel = document.getElementById('fps-label');
		this.videoElement = document.getElementById('videoElement');
		this.cameraOverlay = document.getElementById('camera-overlay');
		this.cameraPlaceholder = document.getElementById('camera-placeholder');

		// Tone selector
		this.toneSelect = document.getElementById('tone-select');

		// State elements
		this.stateIdle = document.getElementById('state-idle');
		this.stateLoading = document.getElementById('state-loading');
		this.stateResult = document.getElementById('state-result');

		// Result elements
		this.detectedName = document.getElementById('detected-name');
		this.detectedConfidence = document.getElementById('detected-confidence');
		this.confidenceFill = document.getElementById('confidence-fill');

		// Fun fact elements
		this.funFactLoading = document.getElementById('fun-fact-loading');
		this.funFactContent = document.getElementById('fun-fact-content');
		this.funFactText = document.getElementById('fun-fact-text');
		this.btnCopy = document.getElementById('btn-copy');

		// Cache input elements for enabling/disabling
		this.inputElements = [
			this.btnToggle,
			this.cameraSelect,
			this.fpsSlider,
			this.toneSelect
		].filter(el => el !== null);
	}

	getFunFactText() {
		return this.funFactText?.textContent || '';
	}

	setCopyButtonCopied() {
		if (this.btnCopy) {
			this.btnCopy.classList.add('copied');
			this.btnCopy.innerHTML = '<i data-lucide="check" width="18" height="18"></i>';
			if (typeof lucide !== 'undefined') {
				lucide.createIcons();
			}
		}
	}

	resetCopyButton() {
		if (this.btnCopy) {
			this.btnCopy.classList.remove('copied');
			this.btnCopy.innerHTML = '<i data-lucide="copy" width="18" height="18"></i>';
			if (typeof lucide !== 'undefined') {
				lucide.createIcons();
			}
		}
	}

	switchToState(newState) {
		hideElement(this.stateIdle);
		hideElement(this.stateLoading);
		hideElement(this.stateResult);

		switch (newState) {
			case 'idle':
				showElement(this.stateIdle);
				break;
			case 'loading':
				showElement(this.stateLoading);
				break;
			case 'result':
				showElement(this.stateResult);
				break;
		}
	}

	updateCameraUI(isActive) {
		if (isActive) {
			this.btnToggle.classList.add('scanning');
			this.btnToggleIcon.innerHTML = '<i data-lucide="square" width="24" height="24"></i>';
			if (this.cameraOverlay) this.cameraOverlay.classList.add('active');
			if (this.cameraPlaceholder) hideElement(this.cameraPlaceholder);
			this.updateHeaderStatus('Scanning...', true);
		} else {
			this.btnToggle.classList.remove('scanning');
			this.btnToggleIcon.innerHTML = '<i data-lucide="scan-line" width="24" height="24"></i>';
			if (this.cameraOverlay) this.cameraOverlay.classList.remove('active');
			if (this.cameraPlaceholder) showElement(this.cameraPlaceholder);
			this.updateHeaderStatus('Siap', false);
		}

		if (typeof lucide !== 'undefined') {
			lucide.createIcons();
		}
	}

	updateHeaderStatus(text, isActive) {
		if (this.headerStatusSpan) {
			this.headerStatusSpan.textContent = text;
		}
		if (this.headerStatusDot) {
			if (isActive) {
				this.headerStatusDot.classList.add('active');
			} else {
				this.headerStatusDot.classList.remove('active');
			}
		}
	}

	enableButton() {
		if (this.btnToggle) {
			this.btnToggle.disabled = false;
			this.btnToggle.style.opacity = '1';
			this.btnToggle.style.cursor = 'pointer';
		}
	}

	disableButton(reason = 'Memuat...') {
		if (this.btnToggle) {
			this.btnToggle.disabled = true;
			this.btnToggle.style.opacity = '0.6';
			this.btnToggle.style.cursor = 'not-allowed';
		}
	}

	updateFPS(fps) {
		if (this.fpsLabel) {
			this.fpsLabel.textContent = `${fps} FPS`;
		}
	}

	disableAllInputs() {
		this.inputElements.forEach(element => {
			if (element) {
				element.disabled = true;
				element.style.opacity = '0.6';
				element.style.cursor = 'not-allowed';
			}
		});
	}

	enableAllInputs() {
		this.inputElements.forEach(element => {
			if (element) {
				element.disabled = false;
				element.style.opacity = '1';
				element.style.cursor = 'pointer';
			}
		});
	}

	updateFunFactState(state, funFactData = null) {
		switch (state) {
			case 'loading':
				this.disableAllInputs();
				hideElement(this.funFactContent);
				showElement(this.funFactLoading);
				break;

			case 'success':
				this.enableAllInputs();
				hideElement(this.funFactLoading);
				showElement(this.funFactContent);

				if (funFactData && funFactData.funFact && this.funFactText) {
					setElementText(this.funFactText, funFactData.funFact);
				}
				break;

			case 'error':
				this.enableAllInputs();
				hideElement(this.funFactLoading);
				showElement(this.funFactContent);
				if (this.funFactText) {
					setElementText(this.funFactText, 'Fakta tidak tersedia');
				}
				break;
		}
	}

	showResults(prediction, funFact) {
		this.switchToState('result');

		// Clear old results before showing new ones
		if (this.funFactText) {
			setElementText(this.funFactText, '');
		}

		if (this.detectedName) {
			setElementText(this.detectedName, prediction.className);
		}

		if (this.detectedConfidence) {
			setElementText(this.detectedConfidence, `${prediction.confidence}%`);
		}
		if (this.confidenceFill) {
			this.confidenceFill.style.width = `${prediction.confidence}%`;
		}

		if (!funFact) {
			this.updateFunFactState('loading');
		} else {
			this.updateFunFactState('success', funFact);
		}

		addFadeInAnimation(this.stateResult);
	}

	showError(message) {
		logError('UI Error', new Error(message));
		this.updateHeaderStatus('Error', false);

		setTimeout(() => {
			this.updateCameraUI(false);
			this.switchToState('idle');
			this.updateHeaderStatus('Siap', false);
		}, 3000);
	}

	bindEvents(callbacks) {
		// Cancel any existing event listeners
		this.abortController?.abort();
		this.abortController = new AbortController();

		const signal = this.abortController.signal;

		if (this.btnToggle && callbacks.onToggleCamera) {
			this.btnToggle.addEventListener('click', (e) => {
				if (this.btnToggle.disabled) {
					e.preventDefault();
					return;
				}
				callbacks.onToggleCamera();
			}, { signal });
		}

		if (this.fpsSlider && callbacks.onFPSChange) {
			this.fpsSlider.addEventListener('input', (e) => {
				const fps = parseInt(e.target.value);
				this.updateFPS(fps);
				callbacks.onFPSChange(fps);
			}, { signal });
		}

		if (this.cameraSelect && callbacks.onCameraChange) {
			this.cameraSelect.addEventListener('change', () => {
				callbacks.onCameraChange();
			}, { signal });
		}

		if (this.toneSelect && callbacks.onToneChange) {
			this.toneSelect.addEventListener('change', (e) => {
				callbacks.onToneChange(e.target.value);
			}, { signal });
		}

		if (this.btnCopy && callbacks.onCopy) {
			this.btnCopy.addEventListener('click', () => {
				callbacks.onCopy();
			}, { signal });
		}
	}

	unbindEvents() {
		this.abortController = null;
	}
}

export default UIHandler;
