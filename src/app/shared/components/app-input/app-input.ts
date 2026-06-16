import { Component, input, output } from '@angular/core';

@Component({
  selector: 'app-input',
  imports: [],
  templateUrl: './app-input.html',
  styleUrl: './app-input.scss',
})
export class AppInput {
  readonly placeholder = input<string>('Type here');
  readonly value = input<string>('');
  readonly valueChanged = output<string>();

  protected onInput(event: Event): void {
    this.valueChanged.emit((event.target as HTMLInputElement).value);
  }
}
