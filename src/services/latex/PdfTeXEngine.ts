/********************************************************************************
 * Copyright (C) 2019 Elliott Wen.
 *
 * This program and the accompanying materials are made available under the
 * terms of the Eclipse Public License v. 2.0 which is available at
 * http://www.eclipse.org/legal/epl-2.0.
 *
 * This Source Code may also be made available under the following Secondary
 * Licenses when the conditions for such availability set forth in the Eclipse
 * Public License v. 2.0 are satisfied: GNU General Public License, version 2
 * with the GNU Classpath Exception which is available at
 * https://www.gnu.org/software/classpath/license.html.
 *
 * SPDX-License-Identifier: EPL-2.0 OR GPL-2.0 WITH Classpath-exception-2.0
 ********************************************************************************/

export enum EngineStatus {
  Init = 1,
  Ready,
  Busy,
  Error,
}

const ENGINE_PATH = '/latex/swiftlatexpdftex.js';

export interface CompileResult {
  pdf: Uint8Array | undefined;
  status: number;
  log: string;
}

export class PdfTeXEngine {
  private latexWorker: Worker | undefined = undefined;
  public latexWorkerStatus: EngineStatus = EngineStatus.Init;
  constructor() {}

  public async loadEngine(): Promise<void> {
    if (this.latexWorker !== undefined) {
      throw new Error('Other instance is running, abort()');
    }
    this.latexWorkerStatus = EngineStatus.Init;

    return new Promise<void>((resolve, reject) => {
      this.latexWorker = new Worker(ENGINE_PATH);
      this.latexWorker.onmessage = (ev: any) => {
        const data: any = ev.data;
        const cmd: string = data.result;
        if (cmd === 'ok') {
          this.latexWorkerStatus = EngineStatus.Ready;
          resolve();
        } else {
          this.latexWorkerStatus = EngineStatus.Error;
          reject();
        }

        this.latexWorker!.onmessage = () => {};
        this.latexWorker!.onerror = () => {};
      };
    });
  }

  public isReady(): boolean {
    return this.latexWorkerStatus === EngineStatus.Ready;
  }

  private checkEngineStatus(): void {
    if (!this.isReady()) {
      throw Error('Engine is still spinning or not ready yet!');
    }
  }

  public async compileLaTeX(workdir: string, mainfile: string): Promise<CompileResult> {
    this.checkEngineStatus();
    this.latexWorkerStatus = EngineStatus.Busy;

    return new Promise<CompileResult>((resolve) => {
      this.latexWorker!.onmessage = (ev: any) => {
        const data: any = ev.data;
        const cmd: string = data.cmd;
        if (cmd !== 'compile') return;

        const result: string = data.result;
        const log: string = data.log;
        const status: number = data.status;

        this.latexWorkerStatus = EngineStatus.Ready;

        resolve({
          pdf: result === 'ok' ? new Uint8Array(data.pdf) : undefined,
          status: status,
          log: log,
        });

        this.latexWorker!.onmessage = () => {};
      };

      this.latexWorker!.postMessage({
        cmd: 'compilelatex',
        workdir: workdir,
        mainfile: mainfile,
      });
    });
  }

  /* Internal Use */
  public async compileFormat(): Promise<void> {
    this.checkEngineStatus();
    this.latexWorkerStatus = EngineStatus.Busy;

    return new Promise<void>((resolve, reject) => {
      this.latexWorker!.onmessage = (ev: any) => {
        const data: any = ev.data;
        const cmd: string = data.cmd;
        if (cmd !== 'compile') return;

        const result: string = data.result;
        const log: string = data.log;

        this.latexWorkerStatus = EngineStatus.Ready;

        if (result === 'ok') {
          const formatArray = data.format;
          const formatBlob = new Blob([formatArray], { type: 'application/octet-stream' });
          const formatURL = URL.createObjectURL(formatBlob);
          console.log('Download format file via ' + formatURL);
          resolve();
        } else {
          reject(log);
        }

        this.latexWorker!.onmessage = () => {};
      };

      this.latexWorker!.postMessage({ cmd: 'compileformat' });
    });
  }

  public setTexliveEndpoint(url: string): void {
    this.latexWorker?.postMessage({ cmd: 'settexliveurl', url: url });
  }

  public closeWorker(): void {
    this.latexWorker?.postMessage({ cmd: 'close' });
    this.latexWorker = undefined;
  }
}
