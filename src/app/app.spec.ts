import { TestBed } from '@angular/core/testing';
import { App } from './app';

describe('App', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({ imports: [App] }).compileComponents();
  });

  it('creates the monthly draw experience', () => {
    const fixture = TestBed.createComponent(App);
    fixture.detectChanges();

    expect(fixture.componentInstance).toBeTruthy();
    expect((fixture.nativeElement as HTMLElement).querySelector('main')).toBeTruthy();
    fixture.destroy();
  });

  it('sobrevive a um link de grupo corrompido', () => {
    window.location.hash = '#grupo=n%C3%A3o-%C3%A9-base64&inicio=2026-05';
    const fixture = TestBed.createComponent(App);
    fixture.detectChanges();

    expect((fixture.nativeElement as HTMLElement).querySelector('main')).toBeTruthy();
    window.location.hash = '';
    fixture.destroy();
  });

  it('carrega a lista de um link de grupo válido', () => {
    window.location.hash = '#grupo=WyJaaWxkYSIsIll1cmkiLCJYYXZpZXIiLCJXYW5kYSJd&inicio=2026-05';
    const fixture = TestBed.createComponent(App);
    fixture.detectChanges();

    expect((fixture.nativeElement as HTMLElement).textContent).toContain('Zilda');
    window.location.hash = '';
    fixture.destroy();
  });
});
