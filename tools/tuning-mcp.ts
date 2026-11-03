import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { z } from 'zod';
import { TuningAgentClient } from '../src/tuning/editor/TuningAgentClient.ts';
import { tuningLimits } from '../src/tuning/contracts/tuningLimits.ts';
import { TuningSettingsPatchDto } from '../src/tuning/contracts/TuningSettingsPatchDto.ts';

const client = new TuningAgentClient();
const server = new McpServer({ name: 'basement-tuning', version: '0.1.0' });
const speedSchema = z.number().min(tuningLimits.minimumMovementSpeed).max(tuningLimits.maximumMovementSpeed);
const describe = (value: unknown) => ({ content: [{ type: 'text' as const, text: JSON.stringify(value, null, 2) }] });

server.registerTool('get_settings', {
  description: 'Read the current preview and saved movement speeds (m/s) and lamp color from the running Basement editor.',
  annotations: { readOnlyHint: true },
}, async () => describe(await client.getSettings()));

server.registerTool('update_settings', {
  description: 'Preview movement speeds and lamp color live in the game and HTML panel. Does not write project files. Use save_settings only when saving is requested.',
  inputSchema: {
    unladenMovementSpeed: speedSchema.optional(),
    carryingMovementSpeed: speedSchema.optional(),
    lampColor: z.string().regex(/^#[\da-f]{6}$/i).optional(),
  },
}, async patch => describe(await client.updateSettings(new TuningSettingsPatchDto(patch.unladenMovementSpeed, patch.carryingMovementSpeed, patch.lampColor))));

server.registerTool('save_settings', {
  description: 'Save the current editor preview to src/tuning/contracts/tuningDefaults.json. This becomes the source for future launches and production builds. Does not stage, commit or publish.',
}, async () => describe(await client.saveSettings()));

server.registerTool('reset_settings', {
  description: 'Discard unsaved preview changes and restore the last saved project settings in the game and HTML panel.',
}, async () => describe(await client.resetSettings()));

await server.connect(new StdioServerTransport());
