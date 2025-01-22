import tailwind from "../../tailwind.config.json";

export class Tailwind {
  public static colors(): typeof tailwind["theme"]["extend"]["colors"] {
    return tailwind.theme.extend.colors;
  }
}
