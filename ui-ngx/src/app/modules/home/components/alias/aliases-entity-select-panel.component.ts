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

import { Component, Inject, InjectionToken, OnInit } from '@angular/core';
import { Timewindow } from '@shared/models/time/time.models';
import { AliasInfo, IAliasController } from '@core/api/widget-api.models';
import { PageComponent } from '@shared/components/page.component';
import { TIMEWINDOW_PANEL_DATA, TimewindowPanelData } from '@shared/components/time/timewindow-panel.component';
import { deepClone } from '@core/utils';

export const ALIASES_ENTITY_SELECT_PANEL_DATA = new InjectionToken<any>('AliasesEntitySelectPanelData');

export interface AliasesEntitySelectPanelData {
  aliasController: IAliasController;
}

@Component({
  selector: 'tb-aliases-entity-select-panel',
  templateUrl: './aliases-entity-select-panel.component.html',
  styleUrls: ['./aliases-entity-select-panel.component.scss']
})
export class AliasesEntitySelectPanelComponent {

  entityAliasesInfo: {[aliasId: string]: AliasInfo} = {};

  constructor(@Inject(ALIASES_ENTITY_SELECT_PANEL_DATA) public data: AliasesEntitySelectPanelData) {
    const allEntityAliases = this.data.aliasController.getEntityAliases();
    for (const aliasId of Object.keys(allEntityAliases)) {
      const aliasInfo = this.data.aliasController.getInstantAliasInfo(aliasId);
      if (aliasInfo && !aliasInfo.resolveMultiple && aliasInfo.currentEntity
        && aliasInfo.resolvedEntities.length > 1) {
        this.entityAliasesInfo[aliasId] = deepClone(aliasInfo);
        this.entityAliasesInfo[aliasId].selectedId = aliasInfo.currentEntity.id;
      }
    }
  }

  public currentAliasEntityChanged(aliasId: string, selectedId: string) {
    const resolvedEntities = this.entityAliasesInfo[aliasId].resolvedEntities;
    const selected = resolvedEntities.find((entity) => entity.id === selectedId);
    if (selected) {
      this.data.aliasController.updateCurrentAliasEntity(aliasId, selected);
    }
  }


}
