/* eslint-disable @typescript-eslint/explicit-member-accessibility */
/* eslint-disable @typescript-eslint/naming-convention */
/**
 * The global API interface for ZingTouch. Contains a constructor for the
 * Region Object, and constructors for each predefined Gesture.
 */
declare module "zingtouch" {
  /**
   * Allows the user to specify a region to capture all events to feed ZingTouch
   * into. This can be as narrow as the element itself, or as big as the document
   * itself. The more specific an area, the better performant the overall
   * application will perform. Contains API methods to bind/unbind specific
   * elements to corresponding gestures. Also contains the ability to
   * register/unregister new gestures.
   */

  class Region {
    constructor(element: HTMLElement, capture?: boolean, preventDefault?: boolean);
    bind(
      element: HTMLElement,
      gesture: RegionGestures,
      handler: (params: GestureEvent) => unknown,
      capture?: boolean
    ): void;
    bind(element: HTMLElement): ZingChainable;
    bindOnce(
      element: HTMLElement,
      gesture: RegionGestures,
      handler: (params: unknown) => unknown,
      capture?: boolean
    ): void;
    bindOnce(element: HTMLElement): ZingChainable;
    unbind(element: HTMLElement, gesture?: RegionGestures): RegionGestures[];
    register(key: string, gesture: Gesture): Gesture;
    unregister(key: string): Gesture;
  }
  /**
   * Constructor function for the Gesture class.
   */
  class Gesture {
    /**
     * The generic string type of gesture ('expand'|'pan'|'pinch'|
     *  'rotate'|'swipe'|'tap').
     */
    type: string;
    /**
     * The unique identifier for each gesture determined at bind time by the
     * state object. This allows for distinctions across instance variables of
     * Gestures that are created on the fly (e.g. Tap-1, Tap-2, etc).
     */
    id: string | null;

    constructor();
    /**
     * Set the type of the gesture to be called during an event
     * @param type - The unique identifier of the gesture being created.
     */
    setType(type: string): void;
    /**
     * getType() - Returns the generic type of the gesture
     * @returns - The type of gesture
     */
    getType(): string;
    /**
     * Set the id of the gesture to be called during an event
     * @param id - The unique identifier of the gesture being created.
     */
    setId(id: string): void;
    /**
     * Return the id of the event. If the id does not exist, return the type.
     */
    getId(): string;
    /**
     * Updates internal properties with new ones, only if the properties exist.
     */
    update(object: unknown): void;
    /**
     * start() - Event hook for the start of a gesture
     * @param inputs - The array of Inputs on the screen
     * @param state - The state object of the current region.
     * @param element - The element associated to the binding.
     * @returns - Default of null
     */
    start(inputs: unknown[], state: unknown, element: Element): null | unknown;
    /**
     * move() - Event hook for the move of a gesture
     * @param inputs - The array of Inputs on the screen
     * @param state - The state object of the current region.
     * @param element - The element associated to the binding.
     * @returns - Default of null
     */
    move(inputs: unknown[], state: unknown, element: Element): null | unknown;
    /**
     * end() - Event hook for the move of a gesture
     * @param inputs - The array of Inputs on the screen
     * @returns - Default of null
     */
    end(inputs: unknown[]): null | unknown;
    /**
     * isValid() - Pre-checks to ensure the invariants of a gesture are satisfied.
     * @param inputs - The array of Inputs on the screen
     * @param state - The state object of the current region.
     * @param element - The element associated to the binding.
     * @returns - If the gesture is valid
     */
    isValid(inputs: unknown[], state: unknown, element: Element): boolean;
  }
  /**
   * A Distance is defined as two inputs moving either together or apart.
   */
  class Distance extends Gesture {
    constructor(options: {
      /**
       * The minimum amount in pixels the inputs must move until it is fired.
       */
      threshold: number;
    });

    /**
     * Event hook for the start of a gesture. Initialized the lastEmitted
     * gesture and stores it in the first input for reference events.
     */
    start(inputs: unknown[]): void;
    /**
     * Event hook for the move of a gesture.
     *  Determines if the two points are moved in the expected direction relative
     *  to the current distance and the last distance.
     * @param inputs - The array of Inputs on the screen.
     * @param state - The state object of the current region.
     * @param element - The element associated to the binding.
     * @returns - Returns the distance in pixels between two inputs
     */
    move(inputs: unknown[], state: unknown, element: Element): unknown | null;
  }
  /**
   * A Pan is defined as a normal movement in unknown direction on a screen.
   * Pan gestures do not track start events and can interact with pinch and \
   *  expand gestures.
   */
  class Pan extends Gesture {
    constructor(options?: PanOptions);
    /**
     * Event hook for the start of a gesture. Marks each input as active,
     * so it can invalidate unknown end events.
     */
    start(inputs: unknown[]): void;
    /**
     * move() - Event hook for the move of a gesture.
     * Fired whenever the input length is met, and keeps a boolean flag that
     * the gesture has fired at least once.
     * @param inputs - The array of Inputs on the screen
     * @param state - The state object of the current region.
     * @param element - The element associated to the binding.
     * @returns - Returns the distance in pixels between the two inputs.
     */
    move(inputs: unknown[], state: unknown, element: Element): unknown;
    /**
     * end() - Event hook for the end of a gesture. If the gesture has at least
     * fired once, then it ends on the first end event such that unknown remaining
     * inputs will not trigger the event until all inputs have reached the
     * touchend event. unknown touchend->touchstart events that occur before all
     * inputs are fully off the screen should not fire.
     * @param inputs - The array of Inputs on the screen
     * @returns - null if the gesture is not to be emitted,
     *  Object with information otherwise.
     */
    end(inputs: unknown[]): null;
  }
  /**
   * A Rotate is defined as two inputs moving about a circle,
   * maintaining a relatively equal radius.
   */
  class Rotate extends Gesture {
    constructor();
    /**
     * move() - Event hook for the move of a gesture. Obtains the midpoint of two
     * the two inputs and calculates the projection of the right most input along
     * a unit circle to obtain an angle. This angle is compared to the previously
     * calculated angle to output the change of distance, and is compared to the
     * initial angle to output the distance from the initial angle to the current
     * angle.
     * @param inputs - The array of Inputs on the screen
     * @param state - The state object of the current listener.
     * @param element - The element associated to the binding.
     * @returns - null if this event did not occur
     * @returns obj.angle - The current angle along the unit circle
     * @returns obj.distanceFromOrigin - The angular distance travelled
     * from the initial right most point.
     * @returns obj.distanceFromLast - The change of angle between the
     * last position and the current position.
     */
    move(inputs: unknown[], state: unknown, element: Element): void;
  }
  /**
   * A swipe is defined as input(s) moving in the same direction in an relatively
   * increasing velocity and leaving the screen at some point before it drops
   * below it's escape velocity.
   */
  class Swipe extends Gesture {
    constructor(options?: SwipeOptions);
    /**
     * Event hook for the move of a gesture. Captures an input's x/y coordinates
     * and the time of it's event on a stack.
     * @param inputs - The array of Inputs on the screen.
     * @param state - The state object of the current region.
     * @param element - The element associated to the binding.
     * @returns - Swipe does not emit from a move.
     */
    move(inputs: unknown[], state: unknown, element: Element): null;
    /**
     * Determines if the input's history validates a swipe motion.
     * Determines if it did not come to a complete stop (maxRestTime), and if it
     * had enough of a velocity to be considered (ESCAPE_VELOCITY).
     * @param inputs - The array of Inputs on the screen
     * @returns - null if the gesture is not to be emitted,
     *  Object with information otherwise.
     */
    end(inputs: unknown[]): null | unknown;
  }
  /**
   * A Tap is defined as a touchstart to touchend event in quick succession.
   */
  class Tap extends Gesture {
    constructor(options?: TapOptions);
    /**
     * Event hook for the start of a gesture. Keeps track of when the inputs
     * trigger the start event.
     * @param inputs - The array of Inputs on the screen.
     * @returns - Tap does not trigger on a start event.
     */
    start(inputs: unknown[]): null;
    /**
     * Event hook for the move of a gesture. The Tap event reaches here if the
     * user starts to move their input before an 'end' event is reached.
     * @param inputs - The array of Inputs on the screen.
     * @param state - The state object of the current region.
     * @param element - The element associated to the binding.
     * @returns - Tap does not trigger on a move event.
     */
    move(inputs: unknown[], state: unknown, element: Element): null;
    /**
     * Event hook for the end of a gesture.
     * Determines if this the tap event can be fired if the delay and tolerance
     * constraints are met. Also waits for all of the inputs to be off the screen
     * before determining if the gesture is triggered.
     * @param inputs - The array of Inputs on the screen.
     * @returns - null if the gesture is not to be emitted,
     * Object with information otherwise. Returns the interval time between start
     * and end events.
     */
    end(inputs: unknown[]): null | unknown;
  }
  /**
   * An Expand is defined as two inputs moving farther away from each other.
   * This gesture does not account for unknown start/end events to allow for the
   * event to interact with the Pan and Pinch events.
   */
  class Expand extends Distance {
    constructor(options: {
      /**
       * The minimum amount in pixels the inputs must move until it is fired.
       */
      threshold: number;
    });
  }

  /**
   * An Pinch is defined as two inputs moving closer to each other.
   * This gesture does not account for unknown start/end events to allow for the event
   * to interact with the Pan and Pinch events.
   */
  class Pinch extends Distance {
    constructor(options: {
      /**
       * The minimum amount in pixels the inputs must move until it is fired.
       */
      threshold: number;
    });
  }

  type RegionGestures =
    | "tap"
    | Tap
    | "pan"
    | Pan
    | "swipe"
    | Swipe
    | "rotate"
    | Rotate
    | "pinch"
    | Pinch
    | "expand"
    | Expand
    | Gesture;
}

interface ZingChainable {
  tap(handler: () => void, capture?: boolean): ZingChainable;
  swipe(handler: () => void, capture?: boolean): ZingChainable;
  pinch(handler: () => void, capture?: boolean): ZingChainable;
  expand(handler: () => void, capture?: boolean): ZingChainable;
  pan(handler: () => void, capture?: boolean): ZingChainable;
  rotate(handler: () => void, capture?: boolean): ZingChainable;
}

interface GestureEvent {
  detail: {
    data: {
      currentDirection: number;
    }[];
  };
}

interface TapOptions {
  /**
   * The minimum amount between a touchstart and a touchend can be configured
   * in milliseconds. The minimum delay starts to count down when the expected
   * number of inputs are on the screen, and ends when ALL inputs are off the
   * screen.
   */
  minDelay: number;
  /**
   * The maximum delay between a touchstart and touchend can be configured in
   * milliseconds. The maximum delay starts to count down when the expected
   * number of inputs are on the screen, and ends when ALL inputs are off the
   * screen.
   */
  maxDelay: number;
  /**
   * The number of inputs to trigger a Tap can be variable,
   * and the maximum number being a factor of the browser.
   */
  numInputs: number;
  /**
   * A move tolerance in pixels allows some slop between a user's start to end
   * events. This allows the Tap gesture to be triggered more easily.
   */
  tolerance: number;
}

interface SwipeOptions {
  /**
   * The number of inputs to trigger a Swipe can be variable,
   * and the maximum number being a factor of the browser.
   */
  numInputs: number;
  /**
   * The maximum resting time a point has between it's last move and
   * current move events.
   */
  maxRestTime: number;
  /**
   * The minimum velocity the input has to be at to emit a swipe.
   * This is useful for determining the difference between
   * a swipe and a pan gesture.
   */
  escapeVelocity: number;
  /**
   * (EXPERIMENTAL) A value of time in milliseconds to distort between events.
   * Browsers do not accurately measure time with the Date constructor in
   * milliseconds, so consecutive events sometimes display the same timestamp
   * but different x/y coordinates. This will distort a previous time
   * in such cases by the timeDistortion's value.
   */
  timeDistortion?: number;
  /**
   * (EXPERIMENTAL) The maximum amount of move events to keep track of for a
   * swipe. This helps give a more accurate estimate of the user's velocity.
   */
  maxProgressStack?: number;
}

interface PanOptions {
  /**
   * The number of inputs to trigger a Pan can be variable,
   * and the maximum number being a factor of the browser.
   */
  numInputs?: number;
  /**
   * The minimum amount in pixels the pan must move until it is fired.
   */
  threshold?: number;
}
