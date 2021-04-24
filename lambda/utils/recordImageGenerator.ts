import jimp from "jimp";

export interface IRecordImageGeneratorArgs {
  programName: string;
  dayName: string;
  date: string;
  exercises: { name: string; value: string; pr: boolean }[];
}

export class RecordImageGenerator {
  public async generate(json: IRecordImageGeneratorArgs): Promise<Buffer> {
    const prefix = process.env.IMGPREFIX || "";
    const [img, trophy, poppinsRegular, poppinsBold, arialBold, arialBoldGray] = await Promise.all([
      jimp.read(`${prefix}images/og_image_bg.png`),
      jimp.read(`${prefix}images/trophy.png`),
      jimp.loadFont(`${prefix}images/poppins-regular.fnt`),
      jimp.loadFont(`${prefix}images/Poppins-Bold.ttf.fnt`),
      jimp.loadFont(`${prefix}images/arial-bold.ttf.fnt`),
      jimp.loadFont(`${prefix}images/arial-bold-gray.ttf.fnt`),
    ]);

    img.print(
      arialBold,
      625,
      100,
      { text: json.programName, alignmentX: jimp.HORIZONTAL_ALIGN_RIGHT },
      525,
      (_, __, pos) => {
        img.print(
          arialBold,
          625,
          pos.y + 3,
          { text: json.dayName, alignmentX: jimp.HORIZONTAL_ALIGN_RIGHT },
          525,
          (___, ____, pos2) => {
            img.print(
              arialBoldGray,
              625,
              pos2.y + 5,
              { text: json.date, alignmentX: jimp.HORIZONTAL_ALIGN_RIGHT },
              525
            );
          }
        );
      }
    );

    for (let i = 0; i < Math.min(json.exercises.length, 7); i += 1) {
      const exercise = json.exercises[i];
      const increase = i * 60;
      img.print(poppinsBold, 50, 200 + increase, `${exercise.name}: `, (err, img2, { x, y }) => {
        img2.print(poppinsRegular, x + 10, 200 + increase, exercise.value, (err2, img3, pos) => {
          if (exercise.pr) {
            img3.composite(trophy, pos.x + 20, 210 + increase);
          }
        });
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
