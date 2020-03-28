import {Directive, ViewContainerRef} from '@angular/core';

@Directive({
  selector: '[classplanTooltipHost]'
})
export class TooltipHostDirective {

  constructor(public viewContainerRef: ViewContainerRef) { }

}
