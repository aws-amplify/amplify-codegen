/* commands for an XCode Swift App */
import { nspawn as spawn } from '..';

const defaultSettings = {
  scheme: undefined,
  target: undefined,
  project: undefined,
  disableCIDetection: false,
};

export function swiftBuild(cwd: string, settings: Object = {}): Promise<void> {
  return new Promise((resolve, reject) => {
    const s = { ...defaultSettings, ...settings };

    const args = [];
    if (s.scheme) args.push('-scheme', s.scheme);
    if (s.target) args.push('-target', s.target);
    if (s.project) args.push('-project', s.project);
    const chain = spawn('xcodebuild', args, { cwd, stripColors: true, disableCIDetection: s.disableCIDetection });

    chain.run((err: Error) => {
      if (err) {
        reject(err);
      } else {
        resolve();
      }
    });
  });
}
