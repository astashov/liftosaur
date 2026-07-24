import { ITestimonial } from "../../src/pages/main/testimonitals";
import { Utils_getEnv } from "../utils";
import { IDI } from "../utils/di";
import { LftS3Buckets } from "./buckets";

const bucketNames = {
  dev: {
    assets: `${LftS3Buckets.assets}dev`,
  },
  prod: {
    assets: LftS3Buckets.assets,
  },
} as const;

export interface ITestimonialsDao {
  updatedAt: string;
  testimonials: ITestimonial[];
}

export class TestimonialDao {
  constructor(private readonly di: IDI) {}

  public async getAll(): Promise<ITestimonial[]> {
    const env = Utils_getEnv();
    const result = await this.di.s3.getObject({
      bucket: bucketNames[env].assets,
      key: `testimonials.json`,
    });
    if (result) {
      const data = result.toString();
      const response: ITestimonialsDao = JSON.parse(data);
      return response.testimonials;
    } else {
      return [];
    }
  }

  public async save(testimonials: ITestimonial[]): Promise<void> {
    const env = Utils_getEnv();
    const data: ITestimonialsDao = {
      updatedAt: new Date().toISOString(),
      testimonials,
    };
    await this.di.s3.putObject({
      bucket: bucketNames[env].assets,
      key: `testimonials.json`,
      body: JSON.stringify(data),
      opts: { contentType: "application/json" },
    });
  }

  public async saveToAll(testimonials: ITestimonial[]): Promise<void> {
    const data: ITestimonialsDao = {
      updatedAt: new Date().toISOString(),
      testimonials,
    };
    const body = JSON.stringify(data);
    await Promise.all(
      (["dev", "prod"] as const).map((env) =>
        this.di.s3.putObject({
          bucket: bucketNames[env].assets,
          key: `testimonials.json`,
          body,
          opts: { contentType: "application/json" },
        })
      )
    );
  }
}
