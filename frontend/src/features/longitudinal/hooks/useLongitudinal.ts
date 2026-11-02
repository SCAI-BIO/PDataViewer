import { useState } from "react";
import { useQuery } from "@tanstack/react-query";

import { fetchMetadata, type Metadata } from "@/lib/api/cohorts";

import { longitudinalQueries } from "../queries";
import { groupRetentionByCohort } from "../utils/retention";

const EMPTY_VARIABLES: string[] = [];
const EMPTY_COLORS: Readonly<Record<string, string>> = {};

function selectCohortColors(metadata: Metadata): Record<string, string> {
  return Object.fromEntries(
    Object.entries(metadata).map(([cohort, values]) => [cohort, values.color]),
  );
}

export function useLongitudinal() {
  const [selectedVariable, setSelectedVariable] = useState("");
  const variablesQuery = useQuery(longitudinalQueries.variables());

  const measurementsQuery = useQuery({
    ...longitudinalQueries.byVariable(selectedVariable),
    select: groupRetentionByCohort,
  });

  const metadataQuery = useQuery({
    queryKey: ["cohorts", "metadata"],
    queryFn: ({ signal }) => fetchMetadata(signal),
    select: selectCohortColors,
  });

  return {
    selectedVariable,
    setSelectedVariable,
    variables: variablesQuery.data ?? EMPTY_VARIABLES,
    colors: metadataQuery.data ?? EMPTY_COLORS,
    variablesQuery,
    measurementsQuery,
    metadataQuery,
  };
}
