///
/// Copyright © 2016-2020 The Thingsboard Authors
///
/// Licensed under the Apache License, Version 2.0 (the "License");
/// you may not use this file except in compliance with the License.
/// You may obtain a copy of the License at
///
///     http://www.apache.org/licenses/LICENSE-2.0
///
/// Unless required by applicable law or agreed to in writing, software
/// distributed under the License is distributed on an "AS IS" BASIS,
/// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
/// See the License for the specific language governing permissions and
/// limitations under the License.
///

import {
  Component,
  ElementRef,
  EventEmitter,
  Input,
  OnChanges,
  OnDestroy,
  OnInit,
  Output, QueryList,
  SimpleChanges,
  ViewChild, ViewChildren, ViewEncapsulation
} from '@angular/core';
import { TranslateService } from '@ngx-translate/core';
import { PageComponent } from '@shared/components/page.component';
import { Store } from '@ngrx/store';
import { AppState } from '@core/core.state';
import { CustomActionDescriptor } from '@shared/models/widget.models';
import * as ace from 'ace-builds';
import { CancelAnimationFrame, RafService } from '@core/services/raf.service';
import { css_beautify, html_beautify } from 'js-beautify';
import { MatTab } from '@angular/material/tabs';
import { BehaviorSubject } from 'rxjs';

@Component({
  selector: 'tb-custom-action-pretty-resources-tabs',
  templateUrl: './custom-action-pretty-resources-tabs.component.html',
  styleUrls: ['./custom-action-pretty-resources-tabs.component.scss'],
  encapsulation: ViewEncapsulation.None
})
export class CustomActionPrettyResourcesTabsComponent extends PageComponent implements OnInit, OnChanges, OnDestroy {

  @Input()
  action: CustomActionDescriptor;

  @Input()
  hasCustomFunction: boolean;

  @Output()
  actionUpdated: EventEmitter<CustomActionDescriptor> = new EventEmitter<CustomActionDescriptor>();

  @ViewChild('htmlInput', {static: true})
  htmlInputElmRef: ElementRef;

  @ViewChild('cssInput', {static: true})
  cssInputElmRef: ElementRef;

  htmlFullscreen = false;
  cssFullscreen = false;

  aceEditors: ace.Ace.Editor[] = [];
  editorsResizeCafs: {[editorId: string]: CancelAnimationFrame} = {};
  aceResizeListeners: { element: any, resizeListener: any }[] = [];
  htmlEditor: ace.Ace.Editor;
  cssEditor: ace.Ace.Editor;
  setValuesPending = false;

  constructor(protected store: Store<AppState>,
              private translate: TranslateService,
              private raf: RafService) {
    super(store);
  }

  ngOnInit(): void {
    this.initAceEditors();
    if (this.setValuesPending) {
      this.setAceEditorValues();
      this.setValuesPending = false;
    }
  }

  ngOnDestroy(): void {
    this.aceResizeListeners.forEach((resizeListener) => {
      // @ts-ignore
      removeResizeListener(resizeListener.element, resizeListener.resizeListener);
    });
  }

  ngOnChanges(changes: SimpleChanges): void {
    for (const propName of Object.keys(changes)) {
      const change = changes[propName];
      if (propName === 'action') {
        if (this.aceEditors.length) {
          this.setAceEditorValues();
        } else {
          this.setValuesPending = true;
        }
      }
    }
  }

  public notifyActionUpdated() {
    this.actionUpdated.emit(this.validate() ? this.action : null);
  }

  private validate(): boolean {
    if (this.action.customResources) {
      for (const resource of this.action.customResources) {
        if (!resource.url) {
          return false;
        }
      }
    }
    return true;
  }

  public addResource() {
    if (!this.action.customResources) {
      this.action.customResources = [];
    }
    this.action.customResources.push({url: ''});
    this.notifyActionUpdated();
  }

  public removeResource(index: number) {
    if (index > -1) {
      if (this.action.customResources.splice(index, 1).length > 0) {
        this.notifyActionUpdated();
      }
    }
  }

  public beautifyCss(): void {
    const res = css_beautify(this.action.customCss, {indent_size: 4});
    if (this.action.customCss !== res) {
      this.action.customCss = res;
      this.cssEditor.setValue(this.action.customCss ? this.action.customCss : '', -1);
      this.notifyActionUpdated();
    }
  }

  public beautifyHtml(): void {
    const res = html_beautify(this.action.customHtml, {indent_size: 4, wrap_line_length: 60});
    if (this.action.customHtml !== res) {
      this.action.customHtml = res;
      this.htmlEditor.setValue(this.action.customHtml ? this.action.customHtml : '', -1);
      this.notifyActionUpdated();
    }
  }

  private initAceEditors() {
    this.htmlEditor = this.createAceEditor(this.htmlInputElmRef, 'html');
    this.htmlEditor.on('input', () => {
      const editorValue = this.htmlEditor.getValue();
      if (this.action.customHtml !== editorValue) {
        this.action.customHtml = editorValue;
        this.notifyActionUpdated();
      }
    });
    this.cssEditor = this.createAceEditor(this.cssInputElmRef, 'css');
    this.cssEditor.on('input', () => {
      const editorValue = this.cssEditor.getValue();
      if (this.action.customCss !== editorValue) {
        this.action.customCss = editorValue;
        this.notifyActionUpdated();
      }
    });
  }

  private createAceEditor(editorElementRef: ElementRef, mode: string): ace.Ace.Editor {
    const editorElement = editorElementRef.nativeElement;
    let editorOptions: Partial<ace.Ace.EditorOptions> = {
      mode: `ace/mode/${mode}`,
      showGutter: true,
      showPrintMargin: true
    };
    const advancedOptions = {
      enableSnippets: true,
      enableBasicAutocompletion: true,
      enableLiveAutocompletion: true
    };
    editorOptions = {...editorOptions, ...advancedOptions};
    const aceEditor = ace.edit(editorElement, editorOptions);
    aceEditor.session.setUseWrapMode(true);
    this.aceEditors.push(aceEditor);

    const resizeListener = this.onAceEditorResize.bind(this, aceEditor);

    // @ts-ignore
    addResizeListener(editorElement, resizeListener);
    this.aceResizeListeners.push({element: editorElement, resizeListener});
    return aceEditor;
  }

  private setAceEditorValues() {
    this.htmlEditor.setValue(this.action.customHtml ? this.action.customHtml : '', -1);
    this.cssEditor.setValue(this.action.customCss ? this.action.customCss : '', -1);
  }

  private onAceEditorResize(aceEditor: ace.Ace.Editor) {
    if (this.editorsResizeCafs[aceEditor.id]) {
      this.editorsResizeCafs[aceEditor.id]();
      delete this.editorsResizeCafs[aceEditor.id];
    }
    this.editorsResizeCafs[aceEditor.id] = this.raf.raf(() => {
      aceEditor.resize();
      aceEditor.renderer.updateFull();
    });
  }

}
