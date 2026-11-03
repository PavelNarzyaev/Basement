import { readFile, rename, writeFile } from 'node:fs/promises';
import type { IncomingMessage, ServerResponse } from 'node:http';
import { resolve } from 'node:path';
import type { Plugin, ViteDevServer } from 'vite';
import { TuningSessionDto } from '../contracts/TuningSessionDto.ts';
import type { TuningSettingsDto } from '../contracts/TuningSettingsDto.ts';
import { tuningEditorSettings } from '../contracts/tuningEditorSettings.ts';
import { LiveTuningSettings } from '../runtime/LiveTuningSettings.ts';
import { TuningSettingsValidator } from '../runtime/TuningSettingsValidator.ts';

export class TuningDevelopmentServer {
  private readonly validator = new TuningSettingsValidator();
  private settings!: LiveTuningSettings;
  private saved!: TuningSettingsDto;
  private settingsPath!: string;
  private pendingOperation: Promise<void> = Promise.resolve();

  createPlugin(): Plugin {
    return {
      name: 'basement-tuning',
      apply: 'serve',
      configureServer: async (server) => {
        this.settingsPath = resolve(server.config.root, 'src/tuning/contracts/tuningDefaults.json');
        this.saved = this.validator.parseSettings(JSON.parse(await readFile(this.settingsPath, 'utf8')));
        this.settings = new LiveTuningSettings(this.saved);
        server.middlewares.use((request, response, next) => {
          if (!request.url?.startsWith(tuningEditorSettings.endpoint)) return next();
          const operation = this.pendingOperation.then(() => this.handleRequest(request, response, server));
          this.pendingOperation = operation.catch(error => {
            response.statusCode = error instanceof TypeError || error instanceof RangeError || error instanceof SyntaxError ? 400 : 500;
            response.setHeader('Content-Type', 'application/json');
            response.end(JSON.stringify({ error: error instanceof Error ? error.message : String(error) }));
          });
        });
      },
      handleHotUpdate: async ({ file, server }) => {
        if (resolve(file) !== this.settingsPath) return;
        // Saving defaults must not reload the game and discard the current play session.
        await this.pendingOperation;
        const saved = this.validator.parseSettings(JSON.parse(await readFile(this.settingsPath, 'utf8')));
        if (JSON.stringify(saved) !== JSON.stringify(this.saved)) {
          this.saved = saved;
          this.settings.applySettings(saved);
          server.ws.send(tuningEditorSettings.updateEvent, this.createSession());
        }
        return [];
      },
    };
  }

  private async handleRequest(request: IncomingMessage, response: ServerResponse, server: ViteDevServer): Promise<void> {
    const origin = request.headers.origin;
    if (origin && origin !== `http://${request.headers.host}`) throw new TypeError('Cross-origin editor requests are not allowed.');
    const endpoint = request.url!.split('?')[0];
    if (request.method === 'GET' && endpoint === tuningEditorSettings.endpoint) {
      this.respond(response);
      return;
    }
    if (request.method !== 'POST') throw new TypeError('Expected GET or POST.');
    if (endpoint === tuningEditorSettings.endpoint) {
      if (request.headers['content-type'] !== 'application/json') throw new TypeError('Expected application/json.');
      const patch: unknown = JSON.parse(await this.readBody(request));
      if (typeof patch !== 'object' || patch === null || Array.isArray(patch) || Object.keys(patch).length === 0) {
        throw new TypeError('Expected a nonempty settings patch.');
      }
      this.settings.applySettings(this.validator.parseSettings({ ...this.settings.createSnapshot(), ...patch }));
    } else if (endpoint === `${tuningEditorSettings.endpoint}/save`) {
      const disk = this.validator.parseSettings(JSON.parse(await readFile(this.settingsPath, 'utf8')));
      if (JSON.stringify(disk) !== JSON.stringify(this.saved)) throw new Error('Defaults changed on disk; wait for synchronization before saving.');
      const snapshot = this.settings.createSnapshot();
      const temporaryPath = `${this.settingsPath}.tmp`;
      await writeFile(temporaryPath, `${JSON.stringify(snapshot, null, 2)}\n`, 'utf8');
      await rename(temporaryPath, this.settingsPath);
      this.saved = snapshot;
    } else if (endpoint === `${tuningEditorSettings.endpoint}/reset`) {
      this.settings.applySettings(this.saved);
    } else {
      throw new TypeError('Unknown editor endpoint.');
    }
    server.ws.send(tuningEditorSettings.updateEvent, this.createSession());
    this.respond(response);
  }

  private async readBody(request: IncomingMessage): Promise<string> {
    const chunks: Buffer[] = [];
    let size = 0;
    for await (const chunk of request) {
      const buffer = Buffer.from(chunk);
      size += buffer.length;
      if (size > tuningEditorSettings.maximumRequestBytes) throw new RangeError('Settings request is too large.');
      chunks.push(buffer);
    }
    return Buffer.concat(chunks).toString('utf8');
  }

  private createSession(): TuningSessionDto {
    const current = this.settings.createSnapshot();
    return new TuningSessionDto(current, this.saved, JSON.stringify(current) !== JSON.stringify(this.saved));
  }

  private respond(response: ServerResponse): void {
    response.setHeader('Content-Type', 'application/json');
    response.setHeader('Cache-Control', 'no-store');
    response.end(JSON.stringify(this.createSession()));
  }
}
