import * as pc from 'picocolors';

export class FileProgressTracker {
  private items: Map<string, { 
    status: 'pending' | 'processing' | 'completed' | 'error', 
    type: 'REPLACE' | 'KEEP' | 'MERGE',
    message?: string 
  }> = new Map();
  private displayLines: number = 0;
  private animationFrame: number = 0;
  private animationTimer?: NodeJS.Timeout;

  constructor() {
    // アニメーションタイマーを開始
    this.animationTimer = setInterval(() => {
      this.animationFrame = (this.animationFrame + 1) % 4;
      const hasProcessing = Array.from(this.items.values()).some(item => item.status === 'processing');
      if (hasProcessing) {
        this.updateDisplay();
      }
    }, 200);
  }

  addItem(name: string, type: 'REPLACE' | 'KEEP' | 'MERGE'): void {
    this.items.set(name, { status: 'pending', type });
    this.updateDisplay();
  }

  startProcessing(name: string): void {
    const item = this.items.get(name);
    if (item) {
      item.status = 'processing';
      this.updateDisplay();
    }
  }

  completeItem(name: string, type: 'REPLACE' | 'KEEP' | 'MERGE'): void {
    const item = this.items.get(name);
    if (item) {
      item.status = 'completed';
      this.updateDisplay();
    }
  }

  errorItem(name: string, error: string): void {
    const item = this.items.get(name);
    if (item) {
      item.status = 'error';
      item.message = error;
      this.updateDisplay();
    }
  }

  private updateDisplay(): void {
    // Clear previous lines
    if (this.displayLines > 0) {
      process.stdout.write('\x1b[' + this.displayLines + 'A'); // Move cursor up
      process.stdout.write('\x1b[0J'); // Clear from cursor to end of screen
    }

    const lines: string[] = [];
    // アルファベット順にソートしてから表示
    const sortedItems = Array.from(this.items.entries()).sort(([nameA], [nameB]) => 
      nameA.toLowerCase().localeCompare(nameB.toLowerCase())
    );
    
    for (const [name, item] of sortedItems) {
      const statusIcon = this.getStatusIcon(item.status);
      const typeTag = this.getTypeTag(item.type);
      const nameColor = this.getNameColor(item.status, item.type);
      const displayName = name.length > 35 ? '...' + name.slice(-32) : name;
      const line = `  ${statusIcon}  ${typeTag} ${nameColor(displayName)}${item.message ? pc.red(` - ${item.message}`) : ''}`;
      lines.push(line);
    }

    this.displayLines = lines.length;
    if (lines.length > 0) {
      console.log(lines.join('\n'));
    }
  }

  private getStatusIcon(status: string): string {
    switch (status) {
      case 'pending': return pc.gray('⚬');
      case 'processing': {
        const spinners = ['⠋', '⠙', '⠹', '⠸', '⠼', '⠴', '⠦', '⠧', '⠇', '⠏'];
        return pc.cyan(spinners[this.animationFrame % spinners.length]);
      }
      case 'completed': return pc.green('✓');
      case 'error': return pc.red('✗');
      default: return '?';
    }
  }

  private getStatusColor(status: string): (text: string) => string {
    switch (status) {
      case 'pending': return pc.dim;
      case 'processing': return pc.cyan;
      case 'completed': return pc.green;
      case 'error': return pc.red;
      default: return pc.white;
    }
  }

  private getTypeTag(type: 'REPLACE' | 'KEEP' | 'MERGE'): string {
    switch (type) {
      case 'REPLACE': return pc.inverse(pc.gray(' REPLACE '));
      case 'KEEP': return pc.inverse(pc.blue('  KEEP   '));
      case 'MERGE': return pc.inverse(pc.yellow('  MERGE  '));
      default: return pc.inverse(pc.white('   ???   '));
    }
  }

  private getNameColor(status: string, type: 'REPLACE' | 'KEEP' | 'MERGE'): (text: string) => string {
    if (status === 'error') return pc.red;
    if (status === 'completed') return pc.green;
    if (status === 'processing') return pc.cyan;
    
    // pending状態の場合、タイプに応じた色を適用
    switch (type) {
      case 'REPLACE': return pc.gray;
      case 'KEEP': return pc.blue;
      case 'MERGE': return pc.yellow;
      default: return pc.dim;
    }
  }

  finish(): void {
    // アニメーションタイマーを停止
    if (this.animationTimer) {
      clearInterval(this.animationTimer);
    }
    // 最終状態を表示
    this.updateDisplay();
    console.log('');
  }
}
