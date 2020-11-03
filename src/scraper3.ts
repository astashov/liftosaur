import cheerio from "cheerio";
import fetch from "node-fetch";
import json from "../exes.json";
import { IExerciseId } from "./models/exercise";
import { ObjectUtils } from "./utils/object";
import util from "util";
import fs from "fs";
import { pipeline } from "stream";
import { CollectionUtils } from "./utils/collection";
const streamPipeline = util.promisify(pipeline);

interface IEquipment {
  barbell: string;
  cable: string;
  dumbbell: string;
  smith: string;
  band: string;
  kettlebell: string;
  bodyweight: string;
  leverageMachine: string;
  medicineball: string;
  ezbar: string;
  trapbar: string;
}

interface IExerciseMeta {
  targetMuscles: string[];
  synergistMuscles: string[];
  bodyPart: string[];
  id: string;
  imageUrl: string;
  pageUrl: string;
}

const cookie =
  "_ga=GA1.2.1295035040.1601237773; _gid=GA1.2.87457043.1604241204; PrestaShop-21a27939ba7ae576599ad20b8156a9bd=dNJTIxK4YCcZiAfVgY%2FAZ0q6FA1J5MYknJaD9d6j4pdTXD9oSN2DQqEh7BPIP6pHg8Fmy5AQVAslzmVh33TIQVofGBapW2YKv%2ByXJn50IIAl2MeEK00%2FhGi3iu4Bs7ZGKsxj%2F8tIrWk841X5dMWpXf%2FWkvLPX48Zde0EfuMT1s4AkIajwIOE66MDTCvIwakt2muT8o0lax9x7anLODOMAmsHxF64GCQ5HtJ5wpeLm6%2FLQCmMYyytr0G9urLPMCm0cNbK%2BEAu8kfI7em7SgKI5WAQnpZ7IS%2Bz9DWScwJ8RFU1SgcIpn6MbA5TctILSCKwnfAYB5LHih%2FSqKeV%2Boew1xXs2GoRDFV9MV2jOU%2Fq0y%2FTiuTGlC6K9cWwlbEDvRexMo3WsnWG%2BcyGigRI%2Fm%2F1Ew8oHiVHADIf8XumMkwxDdWOCRH19zO%2F1I0a3AbrzXDePhPPWRjTONe2uuuru53ZsG%2BhB1%2B%2FUYOKw6N6%2BK4oqVYtkHiVClUMYoUbNt%2FGQlx0SU5c%2FYaSYxMIQxjuWZJrVEcPx54Ef3irmEoi2nRbgkmWtGNUVPS2gPKk762G3%2BYbsYveEzZ4nen4lbvsAE8k0W2Z5NAusrH%2FBuWf4luhiFkWQXbkfhzwq2FfvEMYvI7%2FGQWYo5HkVPEX2tmmYhnOsDQ%2BOjSZ3RQMdpt8CiGKYlB%2FKvid%2FnvpqorJH3P6aoV%2BjswuoSxpJBDfFcIAnKltlX3%2FQNgXgbaX7w7XSagzm%2FiTqYRhdMv60rWdHlioYX3IXlFI5y84D999WodHh0myWA%3D%3D000587";

async function main(): Promise<void> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const exes: Partial<Record<IExerciseId, Partial<Record<keyof IEquipment, IExerciseMeta>>>> = json as any;
  const mapping: Partial<Record<string, [string, string]>> = {};
  for (const exerciseId of ObjectUtils.keys(exes)) {
    const equipments = exes[exerciseId]!;
    for (const equipment of ObjectUtils.keys(equipments)) {
      mapping[equipments[equipment]!.id] = [exerciseId, equipment];
    }
  }
  const entryResponse = await fetch(
    "https://www.gymvisual.com/index.php?controller=order-detail&id_order=3317&id_order=3317&ajax=true",
    { headers: { cookie } }
  ).then((t) => t.text());
  // console.log(entryResponse);

  const $ = cheerio.load(entryResponse);
  const trs = $("#order-detail-content tbody tr").toArray();
  const groups = CollectionUtils.inGroupsOf(40, trs);
  for (const group of groups) {
    await Promise.all(
      group.map(async (el) => {
        const tds = $(el).find("td");
        if (tds.length !== 0) {
          const ref = $(tds.get(0)).find("label").text();
          const link = $(el).find("a").attr("href")!;
          console.log(ref, link);
          const response = await fetch(link, { headers: { cookie } });
          if (!response.ok) {
            throw new Error(`unexpected response ${response.statusText}`);
          }
          const [exerciseId, equipment] = mapping[ref]!;
          console.log(exerciseId, equipment);
          await streamPipeline(
            response.body,
            fs.createWriteStream(`/Users/anton/projects/liftosaur-imgs/${ref}_${exerciseId}_${equipment}.zip`)
          );
        }
      })
    );
  }
}

main();
