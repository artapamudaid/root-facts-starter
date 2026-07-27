import UIHandler from '../ui/ui.handler.js';
import { APP_CONFIG } from './config.js';
import { logError, isValidDetection, createDelay } from './utils.js';
import CameraService from '../services/camera.service.js';
import DetectionService from '../services/detection.service.js';
import FunFactService from '../services/facts.service.js';

class RootFactsApp {
	constructor() {
		this.detector = new DetectionService();
		this.camera = new CameraService();
		this.funFactGenerator = new FunFactService();
		this.ui = new UIHandler();
		this.isRunning = false;
		this.currentLoopId = null;
		this.config = APP_CONFIG;
		this.currentFunFact = '';
		this.currentTone = 'normal';

		this.ui.disableButton();

		this.bindEvents();
		this.registerServiceWorker();
		this.init();
	}

	bindEvents() {
		this.ui.bindEvents({
			onToggleCamera: () => this.toggleCamera(),
			onCameraChange: () => {
				if (this.camera.isActive()) {
					this.startCamera();
				}
			},
			onFPSChange: (fps) => this.camera.setFPS(fps),
			onCopy: () => this.copyFunFact(),
			onToneChange: (tone) => { this.currentTone = tone; }
		});
	}
	
	async init() {
		try {
			this.ui.updateHeaderStatus('Memuat model...', true);
			await Promise.all([
				this.detector.loadModel(),
				this.funFactGenerator.loadModel()
			]);
			this.ui.updateHeaderStatus('Siap', false);
			this.ui.enableButton();
		} catch (error) {
			logError('Gagal menginisialisasi aplikasi', error);
			this.ui.updateHeaderStatus('Error', false);
			this.ui.showError(`Gagal menginisialisasi: ${error.message}`);
			this.ui.disableButton();
		}
	}

	registerServiceWorker() {
		if ('serviceWorker' in navigator) {
			let refreshing = false;

			navigator.serviceWorker.addEventListener('controllerchange', () => {
				if (refreshing) return;
				refreshing = true;
				window.location.reload();
			});

			navigator.serviceWorker.register('./sw.js').then(registration => {
				console.log('SW registered: ', registration);

				registration.update();

				if (registration.waiting) {
					registration.waiting.postMessage({ type: 'SKIP_WAITING' });
				}

				registration.addEventListener('updatefound', () => {
					const newWorker = registration.installing;
					if (!newWorker) return;

					newWorker.addEventListener('statechange', () => {
						if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
							newWorker.postMessage({ type: 'SKIP_WAITING' });
						}
					});
				});
			}).catch(registrationError => {
				console.log('SW registration failed: ', registrationError);
			});
		}
	}

	async copyFunFact() {
		const text = this.ui.getFunFactText();
		if (text && navigator.clipboard) {
			try {
				await navigator.clipboard.writeText(text);
				this.ui.setCopyButtonCopied();
				setTimeout(() => this.ui.resetCopyButton(), 2000);
			} catch (err) {
				console.error('Failed to copy!', err);
			}
		}
	}

	toggleCamera() {
		if (this.camera.isActive()) {
			this.stopCamera();
		} else {
			this.startCamera();
		}
	}

	async startCamera() {
		try {
			const deviceId = this.ui.cameraSelect ? this.ui.cameraSelect.value : 'default';
			const fps = this.ui.fpsSlider ? parseInt(this.ui.fpsSlider.value) : 30;
			await this.camera.startCamera(deviceId, fps);
			this.ui.updateCameraUI(true);
			this.startDetection();
		} catch (error) {
			this.ui.showError(error.message);
		}
	}

	stopCamera() {
		this.camera.stopCamera();
		this.ui.updateCameraUI(false);
		this.stopDetection();
		this.ui.switchToState('idle');
	}

	startDetection() {
		if (this.isRunning) return;
		this.isRunning = true;
		const loopId = Date.now();
		this.currentLoopId = loopId;
		this.detectLoop(loopId);
	}

	stopDetection() {
		this.isRunning = false;
		this.currentLoopId = null;
	}

	async detectLoop(loopId) {
		while (this.isRunning && this.currentLoopId === loopId) {
			if (this.camera.isReady()) {
				try {
					const prediction = await this.detector.predict(this.camera.video);
					
					if (isValidDetection(prediction)) {
						this.stopDetection();
						await this.generateAndShowResults(prediction);
						break;
					}
				} catch (error) {
					console.error('Detection loop error', error);
					await createDelay(1000);
				}
			}
			await createDelay(this.config.detectionRetryInterval);
		}
	}

	async generateAndShowResults(detectionResult) {
		try {
			this.ui.showResults(detectionResult, null); // Tampilkan loading state
			
			const factResult = await this.funFactGenerator.generateFunFact(
				detectionResult.className,
				this.currentTone
			);
			
			this.currentFunFact = factResult.funFact;
			this.ui.showResults(detectionResult, factResult);
		} catch (error) {
			logError('Gagal menampilkan hasil', error);
			this.ui.updateFunFactState('error');
		} finally {
			// Restart deteksi setelah delay agar pengguna bisa scan sayuran lain
			if (this.camera.isActive()) {
				await createDelay(this.config.funFactGenerationDelay);
				if (this.camera.isActive()) {
					this.startDetection();
				}
			}
		}
	}
}

document.addEventListener('DOMContentLoaded', () => {
	const app = new RootFactsApp();

	if (typeof lucide !== 'undefined') {
		lucide.createIcons();
	}
});

export default RootFactsApp;
