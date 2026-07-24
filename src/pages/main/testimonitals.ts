export interface ITestimonial {
  source: "appstore" | "googleplay" | "reddit";
  author: string;
  title?: string;
  text: string;
  rating?: number;
  url: string;
  date: string;
  highlight?: [number, number];
  priority?: number;
}

export function Testimonials_getHighRatingTitles(testimonials: ITestimonial[]): string[] {
  return testimonials.filter((t) => t.source === "appstore" && t.title).map((t) => t.title!);
}
