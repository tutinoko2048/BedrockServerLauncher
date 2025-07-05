import * as cliProgress from 'cli-progress';
import * as pc from 'picocolors';

export class ModernProgressBar {
  private progressBar: cliProgress.SingleBar;
  
  constructor(label: string, total: number) {
    this.progressBar = new cliProgress.SingleBar({
      format: `${pc.cyan(label)} |${pc.green('{bar}')}| {percentage}% | {value}/{total} | ETA: {eta}s`,
      barCompleteChar: '█',
      barIncompleteChar: '░',
      hideCursor: true,
      barsize: 30,
      clearOnComplete: true,
      stopOnComplete: true,
    }, cliProgress.Presets.shades_classic);
    
    this.progressBar.start(total, 0);
  }
  
  update(current: number): void {
    this.progressBar.update(current);
  }
  
  increment(delta: number = 1): void {
    this.progressBar.increment(delta);
  }
  
  stop(): void {
    this.progressBar.stop();
  }
}

export function createDownloadProgress(totalBytes: number): ModernProgressBar {
  return new ModernProgressBar('📥 Downloading bedrock server', totalBytes);
}

export function createExtractionProgress(): ModernProgressBar {
  return new ModernProgressBar('📦 Extracting bedrock server', 100);
}
