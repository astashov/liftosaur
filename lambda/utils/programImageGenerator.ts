import jimp from "jimp";
import { IProgram } from "../../src/types";
import { IEither } from "../../src/utils/types";

export interface IProgramImageGeneratorArgs {
  program: IProgram;
}

export class ProgramImageGenerator {
  public async generate(json: IProgramImageGeneratorArgs): Promise<IEither<Buffer, string>> {
    const prefix = process.env.IMGPREFIX || "";
    const [img, poppinsBold, arialBold] = await Promise.all([
      jimp.read(`${prefix}images/og_programimage_bg.png`),
      jimp.loadFont(`${prefix}images/Poppins-Bold.ttf.fnt`),
      jimp.loadFont(`${prefix}images/arial-bold.ttf.fnt`),
    ]);

    img.print(poppinsBold, 65, 200, { text: json.program.name, alignmentX: jimp.HORIZONTAL_ALIGN_LEFT }, 1000);
    const author = `BY ${json.program.author.toLocaleUpperCase()}`;
    img.print(arialBold, 65, 275, { text: author, alignmentX: jimp.HORIZONTAL_ALIGN_LEFT }, 1000);

    return { success: true, data: await img.getBufferAsync(jimp.MIME_PNG) };
  }
}
