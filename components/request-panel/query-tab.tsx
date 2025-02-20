import { KeyValueEditor } from "@/components/key-value-editor";
import { KeyValuePair, Environment } from "@/types";

interface QueryTabProps {
  params: KeyValuePair[];
  onParamsChange: (params: KeyValuePair[]) => void;
  environments?: Environment[];
  currentEnvironment?: Environment | null;
  onEnvironmentChange?: (environmentId: string) => void;
  onEnvironmentsUpdate?: (environments: Environment[]) => void;
  onAddToEnvironment?: (key: string, value: string) => void;
}

export function QueryTab({
  params,
  onParamsChange,
  environments,
  currentEnvironment,
  onEnvironmentChange,
  onEnvironmentsUpdate,
  onAddToEnvironment,
}: QueryTabProps) {
  return (
    <div className="bg-slate-900 flex-1">
      <KeyValueEditor
        pairs={params}
        onChange={onParamsChange}
        addButtonText="Add Query Parameter"
        environments={environments}
        currentEnvironment={currentEnvironment}
        onEnvironmentChange={onEnvironmentChange}
        onEnvironmentsUpdate={onEnvironmentsUpdate}
        onAddToEnvironment={onAddToEnvironment}
      />
    </div>
  );
}
