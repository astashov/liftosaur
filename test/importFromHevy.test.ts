import "mocha";
import { expect } from "chai";
import { ImportFromHevy_convertHevyCsvToHistoryRecords } from "../src/utils/importFromHevy";
import { Settings_build } from "../src/models/settings";

describe("ImportFromHevy", () => {
  describe("convertHevyCsvToHistoryRecords", () => {
    it("handles invalid date strings without throwing", () => {
      const csv = [
        "title,start_time,end_time,exercise_title,description,exercise_notes,set_index,set_type,weight_lbs,weight_kg,reps",
        "Workout,invalid-date,invalid-date,Squat (Barbell),,notes,0,normal,100,,5",
      ].join("\n");
      const settings = Settings_build();
      const result = ImportFromHevy_convertHevyCsvToHistoryRecords(csv, settings);
      expect(result.historyRecords).to.have.lengthOf(1);
      expect(result.historyRecords[0].date).to.be.a("string");
      expect(new Date(result.historyRecords[0].date).toString()).to.not.equal("Invalid Date");
    });

    it("parses valid dates correctly", () => {
      const csv = [
        "title,start_time,end_time,exercise_title,description,exercise_notes,set_index,set_type,weight_lbs,weight_kg,reps",
        "Workout,2024-01-15T10:00:00Z,2024-01-15T11:00:00Z,Squat (Barbell),,notes,0,normal,100,,5",
      ].join("\n");
      const settings = Settings_build();
      const result = ImportFromHevy_convertHevyCsvToHistoryRecords(csv, settings);
      expect(result.historyRecords).to.have.lengthOf(1);
      expect(result.historyRecords[0].date).to.equal("2024-01-15T11:00:00.000Z");
      expect(result.historyRecords[0].startTime).to.equal(new Date("2024-01-15T10:00:00Z").getTime());
      expect(result.historyRecords[0].endTime).to.equal(new Date("2024-01-15T11:00:00Z").getTime());
    });
  });
});
