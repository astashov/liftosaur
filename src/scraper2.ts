import cheerio from "cheerio";
import fetch from "node-fetch";
import json from "../exes.json";
import { IExerciseId } from "./models/exercise";
import { ObjectUtils } from "./utils/object";

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
  for (const exerciseId of ObjectUtils.keys(exes)) {
    const equipments = exes[exerciseId]!;
    for (const equipment of ObjectUtils.keys(equipments)) {
      const meta = equipments[equipment]!;
      const response = await fetch(meta.pageUrl, { headers: { Cookies: cookie } });
      const responseBody = await response.text();
      const $ = cheerio.load(responseBody);
      const data = {
        token: "aaecaabc84b070e88fd747419733e5a6" || $("input[name=token]").val(),
        id_product: $("input[name=id_product]").val(),
        add: $("input[name=add]").val(),
        id_product_attribute: $("input[name=id_product_attribute]").val(),
        group_6: $("select[name=group_6]").val(),
        Submit: "",
      };
      const rawData = ObjectUtils.keys(data)
        .map((key) => [key, data[key]].join("="))
        .join("&");
      const response2 = await fetch("https://www.gymvisual.com/cart", {
        headers: {
          accept:
            "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.9",
          cookie,
          "accept-language": "en-US,en;q=0.9,ru;q=0.8",
          "cache-control": "no-cache",
          "content-type": "application/x-www-form-urlencoded",
          pragma: "no-cache",
          "sec-fetch-dest": "document",
          "sec-fetch-mode": "navigate",
          "sec-fetch-site": "same-origin",
          "sec-fetch-user": "?1",
          "upgrade-insecure-requests": "1",
        },
        referer: meta.pageUrl,
        referrerPolicy: "strict-origin-when-cross-origin",
        body: rawData,
        method: "POST",
        mode: "cors",
        credentials: "include",
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
      } as any);
      console.log(`${exerciseId}, ${equipment}`);
      console.log(response2.status);
    }
  }
}

main();
