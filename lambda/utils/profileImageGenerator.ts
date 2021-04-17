import jimp from "jimp";

export interface IProfileImageGeneratorArgs {
  programName: string;
  userName: string;
  exercises: { name: string; value: string }[];
}

export class ProfileImageGenerator {
  public async generate(json: IProfileImageGeneratorArgs): Promise<Buffer> {
    const [img, poppinsRegular, poppinsBold, arialBold] = await Promise.all([
      jimp.read("images/og_image_bg.png"),
      jimp.loadFont("images/poppins-regular.fnt"),
      jimp.loadFont("images/Poppins-Bold.ttf.fnt"),
      jimp.loadFont("images/arial-bold.ttf.fnt"),
    ]);

    if (json.userName) {
      img.print(arialBold, 46, 60, { text: json.userName, alignmentX: jimp.HORIZONTAL_ALIGN_LEFT }, 525);
    }
    img.print(arialBold, 360, 135, { text: json.programName, alignmentX: jimp.HORIZONTAL_ALIGN_LEFT }, 525);

    const offset = 320;
    for (let i = 0; i < Math.min(json.exercises.length, 7); i += 1) {
      const exercise = json.exercises[i];
      const increase = i * 60;
      img.print(poppinsBold, 46, offset + increase, `${exercise.name}: `, (err, img2, { x }) => {
        img2.print(poppinsRegular, x + 10, offset + increase, exercise.value);
      });
    }

    return img.getBufferAsync(jimp.MIME_PNG);
  }
}

// async function main() {
//   const result = await exports.handler({
//     body: Buffer.from(
//       JSON.stringify({
//         programName: "5/3/1 For Beginners",
//         dayName: "Week 1 Day 2",
//         date: "Wed, Oct 14, 2020",
//         exercises: [
//           {name: "Bench Press", value: "2 reps x 195 lb", pr: true},
//           {name: "Squat", value: "1 reps x 245 lb", pr: true},
//           {name: "Hanging Leg Raise", value: "12 reps x BW"},
//           {name: "Pull Up", value: "4 reps x 20 lb"},
//           {name: "Push Up", value: "15 reps x BW"},
//           {name: "Pull Up", value: "4 reps x 20 lb"},
//           {name: "Push Up", value: "15 reps x BW"},
//           {name: "Pull Up", value: "4 reps x 20 lb"},
//           {name: "Push Up", value: "15 reps x BW"},
//         ],
//       }),
//       "utf8"
//     ).toString("base64"),
//   });
//   console.log(result.body);
// }
// main();
