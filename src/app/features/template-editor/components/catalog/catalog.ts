import { Component, computed, inject } from '@angular/core';
import { ComponentDocsService } from '../../services/component-docs.service';

const componentDragType = 'application/x-davinci-component-tag';

@Component({
  selector: 'app-catalog',
  imports: [],
  templateUrl: './catalog.html',
  styleUrl: './catalog.scss',
})
export class Catalog {
  protected readonly componentDocs = inject(ComponentDocsService);
  protected readonly components = this.componentDocs.components;
  protected readonly isLoading = this.componentDocs.isLoading;
  protected readonly hasError = this.componentDocs.hasError;
  protected readonly hasComponents = computed(() => this.components().length > 0);

  protected imagePath(tag: string): string {
    return `/assets/${tag}.png`;
  }

  protected onDragStart(event: DragEvent, tag: string): void {
    event.dataTransfer?.setData(componentDragType, tag);
    event.dataTransfer?.setData('text/plain', tag);

    if (event.dataTransfer) {
      event.dataTransfer.effectAllowed = 'copy';
    }
  }
}
