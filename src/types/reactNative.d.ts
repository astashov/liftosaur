/* eslint-disable @typescript-eslint/naming-convention */
import "react";
import "react-native";

declare module "react-native" {
  interface ViewProps {
    dataSet?: Record<string, string | number | boolean | undefined>;
  }
}

declare module "react" {
  interface HTMLAttributes<T> {
    testID?: string;
    dataSet?: Record<string, string | number | boolean | undefined>;
  }
  interface InputHTMLAttributes<T> {
    testID?: string;
    dataSet?: Record<string, string | number | boolean | undefined>;
  }
  interface ButtonHTMLAttributes<T> {
    testID?: string;
    dataSet?: Record<string, string | number | boolean | undefined>;
  }
  interface SelectHTMLAttributes<T> {
    testID?: string;
    dataSet?: Record<string, string | number | boolean | undefined>;
  }
  interface TextareaHTMLAttributes<T> {
    testID?: string;
    dataSet?: Record<string, string | number | boolean | undefined>;
  }
  interface FormHTMLAttributes<T> {
    testID?: string;
    dataSet?: Record<string, string | number | boolean | undefined>;
  }
  interface LabelHTMLAttributes<T> {
    testID?: string;
    dataSet?: Record<string, string | number | boolean | undefined>;
  }
  interface LiHTMLAttributes<T> {
    testID?: string;
    dataSet?: Record<string, string | number | boolean | undefined>;
  }
}
