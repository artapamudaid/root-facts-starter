import { logError, validateModelMetadata, isWebGPUSupported } from '../core/utils.js';

class DetectionService {
	constructor() {
		this.model = null;
		this.labels = [];
		this.config = null;
	}

	async loadModel() {
		try {
			// Coba WebGPU dulu, fallback ke WebGL
			try {
				if (isWebGPUSupported()) {
					await tf.setBackend('webgpu');
				} else {
					await tf.setBackend('webgl');
				}
			} catch (backendError) {
				console.warn('WebGPU gagal, fallback ke WebGL:', backendError.message);
				await tf.setBackend('webgl');
			}
			await tf.ready();

			this.model = await tf.loadLayersModel('./model/model.json');
			
			const metadataResponse = await fetch('./model/metadata.json');
			const metadata = await metadataResponse.json();
			
			if (validateModelMetadata(metadata)) {
				this.labels = metadata.labels;
			} else {
				throw new Error("Metadata model tidak valid");
			}
		} catch (error) {
			logError('Failed to load model', error);
			throw new Error(`Failed to load model: ${error.message}`);
		}
	}

	async predict(imageElement) {
		if (!this.model) throw new Error("Model belum dimuat");
		
		let tensor;
		let predictions;
		try {
			// Normalisasi Teachable Machine: bagi 255 (range [0, 1])
			tensor = tf.browser.fromPixels(imageElement)
				.resizeBilinear([224, 224])
				.toFloat()
				.div(tf.scalar(255))
				.expandDims(0);

			predictions = await this.model.predict(tensor).data();
			
			let highestProb = 0;
			let bestIndex = 0;
			for (let i = 0; i < predictions.length; i++) {
				if (predictions[i] > highestProb) {
					highestProb = predictions[i];
					bestIndex = i;
				}
			}
			
			return {
				className: this.labels[bestIndex],
				confidence: Math.round(highestProb * 100),
				isValid: true
			};
		} catch (error) {
			logError('Prediction error', error);
			throw new Error(`Prediksi gagal: ${error.message}`);
		} finally {
			if (tensor) tensor.dispose();
		}
	}

	isLoaded() {
		return !!this.model;
	}
}

export default DetectionService;
