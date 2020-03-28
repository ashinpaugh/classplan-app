import {NgModule} from '@angular/core';
import {TooltipHostDirective} from './tooltip-host/tooltip-host.directive';


@NgModule({
  declarations: [
    TooltipHostDirective,
  ],
  exports: [
    TooltipHostDirective,
  ],
  imports: [],
  providers: [],
  bootstrap: [],
  entryComponents: [],
})
export class DirectivesModule { }
