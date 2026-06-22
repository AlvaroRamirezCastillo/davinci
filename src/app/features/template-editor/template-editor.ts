import { HttpClient } from '@angular/common/http';
import { Component, computed, inject, signal, viewChild } from '@angular/core';
import { finalize } from 'rxjs';
import { Catalog } from './components/catalog/catalog';
import { DesignCanvas } from './components/design-canvas/design-canvas';

const metadataApiUrl = 'http://localhost:3000/api/metadata';

@Component({
  selector: 'app-template-editor',
  imports: [Catalog, DesignCanvas],
  templateUrl: './template-editor.html',
  styleUrl: './template-editor.scss',
})
export class TemplateEditor {
  private readonly http = inject(HttpClient);
  private readonly designCanvas = viewChild(DesignCanvas);

  protected readonly generatedMetadata = signal('');
  protected readonly isSendingMetadata = signal(false);
  protected readonly metadataStatus = signal<'idle' | 'success' | 'error'>('idle');
  protected readonly hasGeneratedMetadata = computed(() => this.generatedMetadata().length > 0);

  protected generateMetadata(): void {
    if (this.isSendingMetadata()) {
      return;
    }

    const metadata = this.designCanvas()?.generateMetadata();

    if (!metadata) {
      return;
    }

    this.generatedMetadata.set(JSON.stringify(metadata, null, 2));
    this.metadataStatus.set('idle');
    this.isSendingMetadata.set(true);

    this.http
      .post(metadataApiUrl, metadata)
      .pipe(finalize(() => this.isSendingMetadata.set(false)))
      .subscribe({
        next: () => this.metadataStatus.set('success'),
        error: () => this.metadataStatus.set('error'),
      });
  }
}
