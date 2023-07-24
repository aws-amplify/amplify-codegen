/* commands for a Android */
import path from 'path';
import { nspawn as spawn } from '..';

const defaultSettings = {
  disableCIDetection: false,
};

export function androidBuild(cwd: string, settings: Object = {}): Promise<void> {
  return new Promise((resolve, reject) => {
    const s = { ...defaultSettings, ...settings };

    const chain = spawn('gradlew', ['build'], {
      cwd,
      stripColors: true,
      disableCIDetection: s.disableCIDetection,
      addLeadingPathPeriod: true,
    });

    chain.run((err: Error) => {
      if (err) {
        reject(err);
      } else {
        resolve();
      }
    });
  });
};

export function acceptLicenses(cwd: string, settings: Object = {}): Promise<void> {
  return new Promise((resolve, reject) => {
    const s = { ...defaultSettings, ...settings };

    const chain = spawn('sdkmanager', ['--licenses'], {
      cwd,
      stripColors: true,
      disableCIDetection: s.disableCIDetection
    })
    .wait("Review licenses that have not been accepted (y/N)?")
    .sendLine("y");

    chain.run((err: Error) => {
      if (err) {
        reject(err);
      } else {
        resolve();
      }
    });
  });
};
