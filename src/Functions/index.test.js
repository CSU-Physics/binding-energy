import {
  BE_func,
  liquid_drop_model,
  mass_defect_func,
} from "./index.js";

describe("mass-defect binding energy", () => {
  test("reproduces the deuteron calculation from its tabulated atomic mass", () => {
    const atomicMassU = 2.014101777844;

    expect(mass_defect_func(atomicMassU, 1, 1)).toBeCloseTo(
      0.0023881845480651087,
      12,
    );
    expect(BE_func(atomicMassU, 1, 1)).toBeCloseTo(
      2.224578657579654,
      10,
    );
  });
});

describe("conventional liquid-drop model", () => {
  test.each([
    [1, 1, -4.6611925386995505],
    [1, 2, 2.3245079496761027],
    [2, 2, 22.841006757267255],
    [26, 30, 495.38369993957514],
    [82, 126, 1634.2633616434543],
  ])("calculates Z=%i, N=%i", (Z, N, expectedEnergy) => {
    expect(liquid_drop_model(Z, N)).toBeCloseTo(expectedEnergy, 10);
  });

  test("rejects non-integer or empty nuclei", () => {
    expect(() => liquid_drop_model(1.5, 2)).toThrow(RangeError);
    expect(() => liquid_drop_model(-1, 2)).toThrow(RangeError);
    expect(() => liquid_drop_model(0, 0)).toThrow(RangeError);
  });
});
