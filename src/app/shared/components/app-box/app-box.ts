import { Component, input, output } from '@angular/core';

@Component({
  selector: 'app-box',
  imports: [],
  templateUrl: './app-box.html',
  styleUrl: './app-box.scss',
})
export class AppBox {
  readonly text = input<string>('hello world');
  readonly boxClicked = output<void>();

  protected onClick(): void {
    this.boxClicked.emit();
  }
}
