import "mocha";
import { expect } from "chai";
import { buildState, IState } from "../src/models/state";
import { Storage_getDefault } from "../src/models/storage";
import {
  EditEquipment_copy,
  EditEquipment_copyName,
  EditEquipment_copyConfirmText,
  EditEquipment_copyListConfirmText,
  EditEquipment_copyForExercise,
  EditEquipment_removal,
  EditEquipment_removeForExercise,
} from "../src/models/editEquipment";
import { Equipment_getEquipmentIdForExerciseType } from "../src/models/equipment";
import { IDispatch } from "../src/ducks/types";
import { IExerciseType, ISettings } from "../src/types";

const bench: IExerciseType = { id: "benchPress", equipment: "barbell" };

function harness(): { state: () => IState; dispatch: IDispatch } {
  let state = buildState({ storage: Storage_getDefault(), deviceId: "test-device" });
  const dispatch: IDispatch = (action) => {
    if (typeof action !== "function" && action.type === "UpdateState") {
      state = action.lensRecording.reduce((s, r) => r.fn(s), state);
    }
  };
  return { state: () => state, dispatch };
}

function settingsOf(h: { state: () => IState }): ISettings {
  return h.state().storage.settings;
}

describe("EditEquipment", () => {
  it("explains a copy before making it", () => {
    const settings = settingsOf(harness());
    const gymId = settings.gyms[0].id;
    expect(EditEquipment_copyConfirmText(settings, gymId, "barbell", bench)).to.equal(
      'This creates new equipment "Bench Press", a copy of Barbell. Only Bench Press uses it. Other exercises keep using Barbell.'
    );
  });

  it("copies equipment under the next free name without linking anything", () => {
    const h = harness();
    const gymId = settingsOf(h).gyms[0].id;
    expect(EditEquipment_copyName(settingsOf(h).gyms[0].equipment, "barbell")).to.equal("Barbell 2");
    expect(EditEquipment_copyListConfirmText(settingsOf(h).gyms[0].equipment, "barbell")).to.equal(
      'Create "Barbell 2", a copy of Barbell? No exercise uses it until you pick it for one.'
    );
    const first = EditEquipment_copy(h.dispatch, settingsOf(h), gymId, "barbell")!;
    const second = EditEquipment_copy(h.dispatch, settingsOf(h), gymId, "barbell")!;
    const equipment = settingsOf(h).gyms[0].equipment;
    expect([equipment[first]?.name, equipment[second]?.name]).to.eql(["Barbell 2", "Barbell 3"]);
    expect(equipment[first]?.setup).to.eql(equipment.barbell?.setup);
    expect(Equipment_getEquipmentIdForExerciseType(settingsOf(h), bench, gymId)).to.equal("barbell");
  });

  it("hides a built-in without changing the exercise", () => {
    const h = harness();
    const gymId = settingsOf(h).gyms[0].id;
    expect(EditEquipment_removal(settingsOf(h), gymId, "barbell", bench).label).to.equal("Hide Barbell");
    EditEquipment_removeForExercise(h.dispatch, settingsOf(h), gymId, "barbell", bench);
    expect(settingsOf(h).gyms[0].equipment.barbell?.isDeleted).to.equal(true);
    expect(Equipment_getEquipmentIdForExerciseType(settingsOf(h), bench, gymId)).to.equal("barbell");
  });

  it("deletes a copy and puts the exercise back on its default equipment", () => {
    const h = harness();
    const gymId = settingsOf(h).gyms[0].id;
    const copyId = EditEquipment_copyForExercise(h.dispatch, settingsOf(h), gymId, "barbell", bench)!;
    expect(Equipment_getEquipmentIdForExerciseType(settingsOf(h), bench, gymId)).to.equal(copyId);
    expect(EditEquipment_removal(settingsOf(h), gymId, copyId, bench)).to.eql({
      label: "Delete Bench Press",
      confirm: "Delete Bench Press? Bench Press goes back to Barbell after that.",
    });
    EditEquipment_removeForExercise(h.dispatch, settingsOf(h), gymId, copyId, bench);
    expect(settingsOf(h).gyms[0].equipment[copyId]?.isDeleted).to.equal(true);
    expect(Equipment_getEquipmentIdForExerciseType(settingsOf(h), bench, gymId)).to.equal("barbell");
  });

  it("leaves the exercise with no equipment when its default is hidden", () => {
    const h = harness();
    const gymId = settingsOf(h).gyms[0].id;
    const copyId = EditEquipment_copyForExercise(h.dispatch, settingsOf(h), gymId, "barbell", bench)!;
    EditEquipment_removeForExercise(h.dispatch, settingsOf(h), gymId, "barbell", bench);
    expect(EditEquipment_removal(settingsOf(h), gymId, copyId, bench).confirm).to.equal(
      "Delete Bench Press? Bench Press has no equipment after that."
    );
    EditEquipment_removeForExercise(h.dispatch, settingsOf(h), gymId, copyId, bench);
    expect(Equipment_getEquipmentIdForExerciseType(settingsOf(h), bench, gymId)).to.equal(undefined);
  });
});
