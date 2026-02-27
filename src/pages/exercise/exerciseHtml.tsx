import { h, JSX } from "preact";
import { IJsonLd, Page } from "../../components/page";
import { Exercise_get, Exercise_reverseName, Exercise_toKey } from "../../models/exercise";
import { exerciseDescriptions } from "../../models/exerciseDescriptions";
import { ExerciseImageUtils_ogImageUrl } from "../../models/exerciseImage";
import { IExerciseType } from "../../types";
import { ExerciseContent } from "./exerciseContent";

interface IProps {
  client: Window["fetch"];
  id: string;
  exerciseType: IExerciseType;
  filterTypes: string[];
  isLoggedIn?: boolean;
}

export function ExerciseHtml(props: IProps): JSX.Element {
  const { client, id, isLoggedIn, ...data } = props;
  const exercise = Exercise_get(data.exerciseType, {});
  const name = Exercise_reverseName(exercise);
  const title = `${name} | Liftosaur`;
  const url = `https://www.liftosaur.com/exercises/${id}`;

  const key = Exercise_toKey(data.exerciseType).toLowerCase();
  const entry = exerciseDescriptions[key];
  const description =
    entry?.description ||
    "Description of the exercise, how to perform it with proper form, muscles worked, and with what exercises you can substitute it.";

  const jsonLd: IJsonLd[] = [
    {
      type: "BreadcrumbList",
      items: [
        { name: "Home", url: "https://www.liftosaur.com" },
        { name: "Exercises", url: "https://www.liftosaur.com/exercises" },
        { name },
      ],
    },
  ];

  if (entry?.howto && entry.howto.length > 0) {
    jsonLd.push({
      type: "HowTo",
      name: `How to do ${name}`,
      step: entry.howto,
    });
  }

  if (entry?.video) {
    jsonLd.push({
      type: "VideoObject",
      name: `How to do ${name}`,
      description: description,
      thumbnailUrl: `https://img.youtube.com/vi/${entry.video}/hqdefault.jpg`,
      embedUrl: `https://www.youtube.com/embed/${entry.video}`,
    });
  }

  return (
    <Page
      css={["exercise"]}
      js={["exercise"]}
      nowrapper={true}
      maxWidth={1200}
      title={title}
      canonical={url}
      isLoggedIn={!!isLoggedIn}
      description={description}
      ogUrl={url}
      ogImage={`https://www.liftosaur.com${ExerciseImageUtils_ogImageUrl(data.exerciseType)}`}
      jsonLd={jsonLd}
      data={data}
      client={client}
    >
      <ExerciseContent client={client} isLoggedIn={isLoggedIn} {...data} />
    </Page>
  );
}
