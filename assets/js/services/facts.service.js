import { logError, isWebGPUSupported } from '../core/utils.js';
import { pipeline, env } from 'https://cdn.jsdelivr.net/npm/@xenova/transformers@2.17.2';

class FunFactService {
	constructor() {
		this.generator = null;
		this.isModelLoaded = false;
		this.isGenerating = false;
		this.config = null;
		this.currentBackend = null;
	}

	async loadModel() {
		try {
			env.allowLocalModels = false;

			const progressCallback = (progress) => {
				if (progress.status === 'progress') {
					console.log(`Downloading model: ${progress.file} - ${Math.round(progress.progress)}%`);
				}
			};

			// Coba WebGPU dulu jika tersedia, fallback ke default (wasm)
			if (isWebGPUSupported()) {
				try {
					this.generator = await pipeline('text2text-generation', 'Xenova/LaMini-Flan-T5-77M', {
						device: 'webgpu',
						progress_callback: progressCallback
					});
					this.currentBackend = 'webgpu';
					this.isModelLoaded = true;
					return;
				} catch (webgpuError) {
					console.warn('WebGPU tidak tersedia, beralih ke default backend:', webgpuError.message);
				}
			}

			// Default backend (wasm) — stabil di semua platform
			this.generator = await pipeline('text2text-generation', 'Xenova/LaMini-Flan-T5-77M', {
				progress_callback: progressCallback
			});
			this.currentBackend = 'wasm';
			this.isModelLoaded = true;

		} catch (error) {
			logError('Error loading Transformers.js model', error);
			throw new Error(`Failed to load FunFact model: ${error.message}`);
		}
	}

	async generateFunFact(vegetable, tone = 'normal') {
		if (!this.isModelLoaded || this.isGenerating) {
			throw new Error('Model belum siap atau sedang menghasilkan fakta');
		}

		if (!vegetable || typeof vegetable !== 'string') {
			throw new Error('Nama sayuran yang valid diperlukan');
		}

		this.isGenerating = true;
		try {
			const cleanVegetable = vegetable.replace(/[^a-zA-Z0-9\s-]/g, '').substring(0, 50);
			const prompt = `Write a short fun fact about ${cleanVegetable} in a ${tone} tone.`;
			
			const result = await this.generator(prompt, {
				max_new_tokens: 80,
				temperature: 0.1,
				top_p: 0.8
			});
			
			let funFact = result[0].generated_text;
			return {
				funFact: funFact,
				tone: tone,
				vegetable: cleanVegetable
			};
		} catch (error) {
			logError('Error generating fun fact', error);
			throw new Error(`Failed to generate fun fact: ${error.message}`);
		} finally {
			this.isGenerating = false;
		}
	}

	isReady() {
		return this.isModelLoaded && !this.isGenerating;
	}
}

export default FunFactService;
