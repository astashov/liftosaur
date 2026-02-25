import { h, JSX } from "preact";
import { Page } from "../../components/page";
import { IAccount } from "../../models/account";
import { Exercise_get, Exercise_reverseName } from "../../models/exercise";
import { ExerciseImageUtils_ogImageUrl } from "../../models/exerciseImage";
import { IExerciseType } from "../../types";
import { ExerciseContent } from "./exerciseContent";

interface IProps {
  client: Window["fetch"];
  id: string;
  exerciseType: IExerciseType;
  filterTypes: string[];
  account?: IAccount;
}

export function ExerciseHtml(props: IProps): JSX.Element {
  const { client, id, ...data } = props;
  const exercise = Exercise_get(data.exerciseType, {});
  const name = Exercise_reverseName(exercise);
  const title = `${name} | Liftosaur`;
  const url = `https://www.liftosaur.com/exercises/${id}`;

  return (
    <Page
      css={["exercise"]}
      js={["exercise"]}
      nowrapper={true}
      maxWidth={1200}
      title={title}
      canonical={url}
      account={props.account}
      description="Description of the exercise, how to perform it with proper form, muscles worked, and with what exercises you can substitute it."
      ogUrl={url}
      ogImage={`https://www.liftosaur.com${ExerciseImageUtils_ogImageUrl(data.exerciseType)}`}
      data={data}
      client={client}
    >
      <ExerciseContent client={client} {...data} />
    </Page>
  );
}
