/* eslint-disable @typescript-eslint/naming-convention */

declare module "preact" {
  export type ComponentChildren = React.ReactNode;
  export type ComponentChild = React.ReactNode;
  export type VNode<P = {}> = React.ReactElement<P>;
  export type RefObject<T> = React.RefObject<T>;
  export type StateUpdater<S> = React.Dispatch<React.SetStateAction<S>>;
  export type Ref<T> = React.Ref<T>;

  export { createElement, Fragment, Component, createContext, createRef } from "react";

  export namespace JSX {
    type Element = React.JSX.Element;
    type HTMLAttributes<T = HTMLElement> = React.HTMLAttributes<T>;
    type SVGAttributes<T = SVGElement> = React.SVGAttributes<T>;
    type IntrinsicElements = React.JSX.IntrinsicElements;
  }
}

declare module "preact/hooks" {
  export { useState, useEffect, useRef, useCallback, useMemo, useContext, useReducer, useLayoutEffect } from "react";
  export type { Reducer } from "react";
  export type StateUpdater<S> = React.Dispatch<React.SetStateAction<S>>;
}

declare module "preact/compat" {
  export * from "react";
}
