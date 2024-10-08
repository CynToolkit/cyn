import * as semver from 'semver';
import { coerce } from 'semver';
import { objectKeys } from '../utils/object-keys';

export type Awaitable<T> = Promise<T> | T;

export type MigrationFn<From, To> = (state: From, targetVersion: string) => Awaitable<To>;

export type MigrateOptions = {
  debug?: boolean
}

export interface MigrationSchema {
  version: SemVer;
}

export type OmitVersion<T> = Omit<T, keyof MigrationSchema>;

export type SemVer = `${number}.${number}.${number}`;

export interface MigrationClass<
    Down,
    Current,
    Up,
> {
  version: SemVer;
  up: MigrationFn<Current, Up>;
  down: MigrationFn<Current, Down>;
}

export interface MigrationObjInput<
  Down,
  Current,
  Up,
> {
  version: SemVer;
  up: MigrationFn<OmitVersion<Current>, OmitVersion<Up>>;
  down: MigrationFn<OmitVersion<Current>, OmitVersion<Down>>;
}

export interface MigratorConfig {
  migrations: MigrationClass<any, any, any>[]
  coerce?: boolean
}

export class Migrator<OutputState extends MigrationSchema> {
  current: SemVer;

  migrations: Record<SemVer, MigrationClass<any, any, any>> = {};

  coerce: boolean;

  constructor(config: MigratorConfig) {
    config.migrations.forEach((migration) => {
      this.migrations[migration.version] = migration;
    });

    const versions = this.getVersions();
    this.current = versions[versions.length - 1];

    this.coerce = config?.coerce ?? true;
  }

  getVersions() {
    const keys = objectKeys(this.migrations);
    const versions = semver.sort(keys);
    return versions;
  }

  async migrateUp(state: MigrationSchema) {
    return this.migrateDirection(state, 'up');
  }

  async migrateDown(state: MigrationSchema) {
    return this.migrateDirection(state, 'down');
  }

  async migrate(state: MigrationSchema, options?: MigrateOptions): Promise<OutputState> {
    if (options?.debug) {
      // eslint-disable-next-line no-console
      console.log("Migrating", state.version, "to", this.current);
    }

    const stateVersion = this.tryCoerce(state.version);
    if (this.current === stateVersion) {
      return state as unknown as OutputState;
    }

    let finalState = structuredClone(state);

    while (this.needMigration(finalState.version)) {
      // eslint-disable-next-line no-await-in-loop
      finalState = await this.migrateUp(finalState);
    }

    return finalState as unknown as OutputState;
  }

  async migrateDirection(state: MigrationSchema, type: 'up' | 'down') {
    const newVersion = this.tryCoerce(state.version);
    let finalState = structuredClone(state);

    const versions = this.getVersions();
    const targetVersionIndex = versions.findIndex((version) => version === newVersion);
    const targetVersion = versions[targetVersionIndex];

    const sign = type === 'up' ? 1 : -1;

    let nextVersion;
    const found = versions[targetVersionIndex + (1 * sign)];
    if (found) {
      nextVersion = found;
    } else {
      nextVersion = this.current;
    }

    const keys = this.getVersions();

    if (!keys.includes(newVersion)) {
      throw new Error(`Target migration "${newVersion}" not defined in migrations definition\nSupported versions includes: [${keys.join(', ')}]`);
    }

    const migration = this.migrations[targetVersion];
    if (migration) {
      finalState = await migration[type](finalState, nextVersion) as MigrationSchema;
    } else {
      throw new Error(`Migration for version ${targetVersion} not found`);
    }

    return finalState;
  }

  tryCoerce(version: SemVer) {
    return this.coerce ? coerce(version)?.version as SemVer | undefined ?? version : version;
  }

  needMigration(version: SemVer) {
    const newVersion = this.tryCoerce(version);
    return semver.lt(newVersion, this.current);
  }
}
