import { Component } from '@angular/core';
import { ComponentCatalog } from './components/component-catalog/component-catalog';
import { DesignCanvas } from './components/design-canvas/design-canvas';

@Component({
  selector: 'app-template-editor',
  imports: [ComponentCatalog, DesignCanvas],
  templateUrl: './template-editor.html',
  styleUrl: './template-editor.scss',
})
export class TemplateEditor {}
