import { describe, expect, it } from "vitest";
import { PrismStructure } from "../prismStructure";

describe("PrismStructure", () => {
  it("reports unmatched @if", () => {
    expect(PrismStructure.analyze("@if(true)\nx\n@endif")).toEqual([]);
    const issues = PrismStructure.analyze("@if(true)\nx");
    expect(issues).toHaveLength(1);
    expect(issues[0]!.message).toContain("Unclosed");
  });

  it("accepts inline @section('name', 'value') without @endsection", () => {
    expect(PrismStructure.analyze("@section('title', 'The title')")).toEqual([]);
    expect(PrismStructure.analyze('@section("title", "Hello, world")')).toEqual([]);
    expect(
      PrismStructure.analyze("@extends('layouts.app')\n@section('title', 'Hi')\n"),
    ).toEqual([]);
  });

  it("still requires @endsection for block @section('name')", () => {
    const issues = PrismStructure.analyze("@section('title')\nHi");
    expect(issues).toHaveLength(1);
    expect(issues[0]!.message).toContain("Unclosed @section");
    expect(
      PrismStructure.analyze("@section('title')\nHi\n@endsection"),
    ).toEqual([]);
  });

  it("accepts @show as a @section closer", () => {
    expect(
      PrismStructure.analyze("@section('content')\n<body>\n@show"),
    ).toEqual([]);
  });
});
