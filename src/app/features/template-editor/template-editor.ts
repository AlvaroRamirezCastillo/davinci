import { Component, computed, signal, viewChild } from '@angular/core';
import { Catalog } from './components/catalog/catalog';
import { DesignCanvas } from './components/design-canvas/design-canvas';

@Component({
  selector: 'app-template-editor',
  imports: [Catalog, DesignCanvas],
  templateUrl: './template-editor.html',
  styleUrl: './template-editor.scss',
})
export class TemplateEditor {
  private readonly designCanvas = viewChild(DesignCanvas);

  protected readonly generatedMetadata = signal('');
  protected readonly hasGeneratedMetadata = computed(() => this.generatedMetadata().length > 0);

  protected generateMetadata(): void {
    const metadata = this.designCanvas()?.generateMetadata();

    if (!metadata) {
      return;
    }

    this.generatedMetadata.set(JSON.stringify(metadata, null, 2));
  }
}
