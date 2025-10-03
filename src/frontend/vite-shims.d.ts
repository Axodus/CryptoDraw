// Shim de tipos para evitar erro "Não é possível localizar o módulo 'vite'..."
/// <reference types="vite/client" />

declare module 'vite' {
	// Tipagem mínima para defineConfig; ajuste se desejar tipos mais estritos
	export function defineConfig(config: any): any;

	// Exportações auxiliares (opcionais, para evitar erros de importação)
	export type UserConfig = { [key: string]: any };
	export type Plugin = any;
}
