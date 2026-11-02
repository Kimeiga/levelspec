#!/usr/bin/env node
import { main } from '../src/cli/main.ts';
process.exitCode = await main(process.argv.slice(2));
