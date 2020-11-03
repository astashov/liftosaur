import fs from "fs";
// import cheerio from "cheerio";
// import fetch from "node-fetch";

// const url = "https://www.gymvisual.com/3-illustrations?id_category=3&n=20";
//
// async function getReference(href: string): Promise<{ ref: string; img: string }> {
// // nst response = await fetch(href).then((r) => r.text());
// // nst $ = cheerio.load(response);
// eturn { ref: $("#product_reference span").get(0).attribs.content, img: $("#bigpic").get(0).attribs.src };
// }
//
// async function main(): Promise<void> {
// // r (let i = 1; i <= 191; i += 1) {
//  //st response = await fetch(url + `&p=${i}`).then((r) => r.text());
// c// t $ = cheerio.load(response);
//
//  //it Promise.all(
// $("// oduct-container .product_img_link")
// .toAr// ()
// .map(// nc (link) => {
// const  //f = link.attribs.href;
// const r// = await getRawait getReference(href);
// const  //ult = [ref.ref, href.reff.img], ref.img
// console// g(result.join(", "));
// return // ult;
// })//
// )//
//  //sole.log(`Finished Page ${i}`);
// //
// }
//
// main();
//
function main(): void {
  const csv = fs.readFileSync("list2.csv", { encoding: "utf-8" });
  const ids = fs.readFileSync("ids.csv", { encoding: "utf-8" });
  const mapping = ids.split("\n").reduce<Record<string, { img: string; url: string }>>((memo, line) => {
    const [id, url, img] = line.split(", ");
    if (id && url && img) {
      memo[id] = { url, img };
    }
    return memo;
  }, {});
  console.log(mapping);
  const newCsv = csv
    .split(/\r\n|\r|\n/)
    .slice(1)
    .map((line) => {
      const match = line.match(/^(\d+),/);
      if (match) {
        const id = match[1];
        if (mapping[id]) {
          const { url, img } = mapping[id];
          line += "," + img;
        }
      }
      return line;
    })
    .join("\n");
  // console.log(newCsv);
  fs.writeFileSync("list3.csv", newCsv, { encoding: "utf-8" });
}

main();
