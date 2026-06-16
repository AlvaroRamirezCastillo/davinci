import { Component } from '@angular/core';
import { Catalog } from './components/catalog/catalog';
import { DesignCanvas } from './components/design-canvas/design-canvas';

@Component({
  selector: 'app-template-editor',
  imports: [Catalog, DesignCanvas],
  templateUrl: './template-editor.html',
  styleUrl: './template-editor.scss',
})
export class TemplateEditor {}
