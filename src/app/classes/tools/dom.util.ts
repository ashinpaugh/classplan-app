import {Observable} from 'rxjs';

export class DomUtil {
  /**
   * Watch an element for changes.
   *
   * @param element The element to observe.
   * @param options The mutation observer options.
   */
  static watch$(element: HTMLElement, options?: MutationObserverInit): Observable<MutationRecord[]> {
    // Options for the observer (which mutations to observe)
    const config: MutationObserverInit = options || { childList: true };

    return new Observable<MutationRecord[]>(
      notifier$ => {

        // Create an observer instance linked to the callback function
        const observer = new MutationObserver((mutationsList: MutationRecord[]) => {
          notifier$.next(mutationsList);
        });

        // Start observing the target node for configured mutations
        observer.observe(element, config);

        return {
          unsubscribe(): void {
            observer.disconnect();

            notifier$.complete();
            notifier$.unsubscribe();
          }
        };
      }
    );
  }
}
