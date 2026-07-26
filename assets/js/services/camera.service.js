import {
	getCameraErrorMessage,
	logError
} from '../core/utils.js';

class CameraService {
	constructor() {
		this.stream = null;
		this.video = null;
		this.canvas = null;
		this.config = null;

		this.initializeElements();
		this.init();
	}

	initializeElements() {
		this.video = document.getElementById('videoElement');
		this.canvas = document.getElementById('canvasElement');
	}

	async init() {
		await this.loadCameras();
	}

	async loadCameras() {
		try {
			// Trigger permission prompt before enumerating
			await navigator.mediaDevices.getUserMedia({ video: true }).then(s => s.getTracks().forEach(t => t.stop())).catch(e => console.warn(e));
			const devices = await navigator.mediaDevices.enumerateDevices();
			const videoDevices = devices.filter(device => device.kind === 'videoinput');
			return videoDevices;
		} catch (error) {
			logError('Gagal memuat kamera', error);
			throw new Error(`Akses kamera gagal: ${error.message}`);
		}
	}

	async startCamera(deviceId = 'default', fps = 30) {
		try {
			this.stopCamera();
			const constraints = {
				video: {
					frameRate: { ideal: fps }
				}
			};
			
			if (deviceId === 'front') {
				constraints.video.facingMode = 'user';
			} else if (deviceId === 'default') {
				constraints.video.facingMode = 'environment';
			} else if (deviceId) {
				constraints.video.deviceId = { exact: deviceId };
			}

			this.stream = await navigator.mediaDevices.getUserMedia(constraints);
			if (this.video) {
				this.video.srcObject = this.stream;
				await new Promise((resolve) => {
					this.video.onloadedmetadata = () => {
						this.video.play();
						resolve();
					};
				});
			}
		} catch (error) {
			logError('Gagal memulai kamera', error);
			const errorMessage = getCameraErrorMessage(error);
			throw new Error(errorMessage);
		}
	}

	stopCamera() {
		if (this.stream) {
			this.stream.getTracks().forEach(track => track.stop());
			this.stream = null;
		}
		if (this.video) {
			this.video.srcObject = null;
		}
	}

	setFPS(fps) {
		if (this.stream) {
			const track = this.stream.getVideoTracks()[0];
			if (track && track.applyConstraints) {
				track.applyConstraints({ frameRate: { ideal: fps } });
			}
		}
	}

	isActive() {
		return !!this.stream && this.stream.active;
	}

	isReady() {
		return !!this.video && this.video.readyState >= 2;
	}
}

export default CameraService;
